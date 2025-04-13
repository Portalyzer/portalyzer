# filepath: backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import yfinance as yf
import datetime as dt
from datetime import datetime
app = Flask(__name__)
CORS(app)  # Enable CORS to allow communication with the React frontend

url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
tables = pd.read_html(url)
sp500_table = tables[0]

ticker_symbols = sp500_table['Symbol'].tolist()



close_prices = pd.read_csv("close_prices_all.csv", index_col = 0, parse_dates = True)
cov_matrix = pd.read_csv("cov_matrix.csv", index_col = 0)

log_returns = np.log(close_prices / close_prices.shift(1)).dropna()
mu = log_returns.mean() * 252
sigma = log_returns.std() * np.sqrt(252)
epsilon = 1e-4
cov_matrix_adj = cov_matrix + epsilon * np.eye(cov_matrix.shape[0])
L = np.linalg.cholesky(cov_matrix_adj.values)
tickers = close_prices.columns
n_assets = len(tickers)
S0 = close_prices.iloc[-1].values

@app.route('/save-data', methods=['POST'])
def save_data():
    data = request.json  # Receive JSON data from the frontend
    print("Received data:", data)
    # Process the data as needed (e.g., save to a database)
    formatted_data = [
        f"{row['symbol']} {row['date']} {row['value']}" for row in data
    ]

    print("Formatted data:", formatted_data)
    with open('portfolio_data.txt', 'w') as f:
        for line in formatted_data:
            f.write(line + '\n')
    return jsonify({"message": "Data received successfully", "data": data})

@app.route('/get-risk-contributions', methods=['GET'])
def get_risk_contributions():
    try:
        # Convert contribution_risk_array to a list for JSON serialization
        contribution_risk_array_list = contribution_risk_array.tolist()
        
        # Create a response dictionary
        response = {
            "tickers": mytickers,
            "contributions": contribution_risk_array_list
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)})

#function to read the stock data from the file
def read_stock_data(file_path):
    stock_data = []
    with open(file_path, 'r') as f:
        for line in f:
            parts = line.strip().split(' ')
            if len(parts) == 3:
                ticker,date,value = parts
                try:
                    value = float(value)
                    stock_data.append({
                        'STOCKTICKER': ticker,
                        'DATE': date,
                        'VALUEBOUGHT': value
                    })
                except ValueError:
                    continue
                return stock_data
            
#data read from the website
data = read_stock_data('formatted_data.txt')

#creating the weights vector for the portfolio
portfolio_data = []

for entry in data:
    ticker = entry['STOCKTICKER']
    date_bought = entry['DATEBOUGHT']
    value_bought = entry['VALUEBOUGHT']

    try:
        date_bought = datetime.strptime(date_bought, '%Y-%m-%d')
        start_date = pd.to_datetime(date_bought)

        ticker_obj = yf.Ticker(ticker)
        hist = ticker_obj.history(start=start_date, end=start_date + pd.Timedelta(days=5))

        # Make both hist index and start_date timezone-naive
        hist.index = hist.index.tz_localize(None) if hist.index.tz is not None else hist.index
        start_date = start_date.tz_localize(None)
        hist = hist[hist.index >= start_date]


        today = ticker_obj.history(period='1d')
        if not hist.empty and not today.empty:
            price_bought = hist['Close'].iloc[0]
            price_today = today['Close'].iloc[0]
            scaled_value = (price_today / price_bought) * value_bought

            portfolio_data.append({
                'TICKER': ticker,
                'VALUE_TODAY': scaled_value
            })
    except Exception as e:
        print(f"Error processing {ticker}: {e}")

weights = np.zeros(n_assets)
total_value = sum([entry['VALUE_TODAY'] for entry in portfolio_data])
for entry in portfolio_data:
    if entry['TICKER'] in tickers:
        idx = list(tickers).index(entry['TICKER'])
        weights[idx] = entry['VALUE_TODAY'] / total_value

#weights is the weights vector for the portfolio






#Here are the functions for the simulation after the data is cleaned up

#First is the function to create the GBM monte carlo simulations
def simulate_gbm_paths(weights, T=1, N=252, M=10000):
    """
    Simulate correlated GBM paths for a portfolio with given weights.
    Returns:
        portfolio_values: (M, N) array of simulated portfolio values
        simulated_prices: (M, N, n_assets) array of asset price paths
    """
    if len(weights) != n_assets:
        raise ValueError(f"Weights array must have shape ({n_assets},)")

    dt = T / N
    weights = np.array(weights)

    simulated_prices = np.zeros((M, N, n_assets))
    simulated_prices[:, 0, :] = S0

    for t in range(1, N):
        Z = np.random.normal(size=(M, n_assets))
        correlated_Z = Z @ L.T
        drift_term = (mu.values - 0.5 * sigma.values ** 2) * dt
        diffusion_term = sigma.values * np.sqrt(dt) * correlated_Z
        simulated_prices[:, t, :] = simulated_prices[:, t-1, :] * np.exp(drift_term + diffusion_term)

    portfolio_values = (simulated_prices / S0) @ weights
    return portfolio_values, simulated_prices


def portfolio_decomposition(weights, cov_matrix, portfolio_values):
    """
    Decomposes portfolio risk into individual asset contributions.
    
    Args:
    - weights: Array of portfolio weights.
    - cov_matrix: Covariance matrix of asset returns.
    - portfolio_values: Simulated portfolio values.
    
    Returns:
    - risk_contributions: Dictionary of individual asset risk contributions.
    """
    # Portfolio variance
    portfolio_variance = np.var(portfolio_values, axis=0).mean()  # Average variance over time
    portfolio_std = np.sqrt(portfolio_variance)
    
    # Decompose portfolio variance into individual asset contributions
    weights = np.array(weights)
    
    # Calculate individual asset variances (diagonal of covariance matrix)
    asset_variances = np.diag(cov_matrix)
    
    # Calculate individual risk contributions (percentage of portfolio variance)
    risk_contributions = {}
    
    total_risk_contribution = 0  # To accumulate the total contribution and ensure it sums to 100%
    
    for i, weight in enumerate(weights):
        # Calculate the marginal contribution to variance (MCV) for asset i
        mcv_i = np.dot(weights.T, cov_matrix.iloc[i])
        
        # Total contribution to variance (TCV) for asset i
        tcv_i = weight * mcv_i
        
        # Accumulate the total risk contribution
        total_risk_contribution += tcv_i
        
        # Store the risk contribution for each asset
        risk_contributions[tickers[i]] = {
            'variance': asset_variances[i],
            'contribution_to_risk': tcv_i,
            'contribution_percent': 100 * tcv_i / portfolio_variance  # Contribution as percentage of total risk
        }
    
    # Normalize to ensure total risk contribution adds up to 100%
    for asset in risk_contributions:
        risk_contributions[asset]['contribution_percent'] = \
            100 * risk_contributions[asset]['contribution_to_risk'] / total_risk_contribution
    
    return risk_contributions



def compute_risk_metrics(portfolio_values):
    """
    Compute risk metrics from the simulated portfolio paths.
    Returns a dictionary of stats.
    """
    final_vals = portfolio_values[:, -1]
    initial_val = portfolio_values[:, 0][0]
    returns = (final_vals - initial_val) / initial_val

    # Dollar stats
    mean_val = np.mean(final_vals)
    std_val = np.std(final_vals)

    # Risk metrics
    VaR_5 = np.percentile(final_vals, 5)
    CVaR_5 = final_vals[final_vals <= VaR_5].mean()

    # Probability metrics
    p_loss = np.mean(returns < 0)
    p_big_loss = np.mean(returns < -0.10)
    p_double = np.mean(returns > 1.0)
    p_half = np.mean(returns < -0.5)

    # Sharpe Ratios
    sharpe_val = mean_val / std_val if std_val != 0 else np.nan
    sharpe_ret = np.mean(returns) / np.std(returns) if np.std(returns) != 0 else np.nan

    return {
        "mean": mean_val,
        "std_dev": std_val,
        "VaR_5%": VaR_5,
        "CVaR_5%": CVaR_5,
        "Sharpe_ratio_value": sharpe_val,
        "Sharpe_ratio_return": sharpe_ret,
        "Prob_loss": p_loss,
        "Prob_>10%_loss": p_big_loss,
        "Prob_doubling": p_double,
        "Prob_halving": p_half
    }


if __name__ == '__main__':
    app.run(debug=True)




portfolio_values, simulated_prices = simulate_gbm_paths(weights)
risk_contributions = portfolio_decomposition(weights, cov_matrix, portfolio_values)
risk_metrics = compute_risk_metrics(portfolio_values)


data = read_stock_data('formatted_data.txt')
mytickers = []
for i in range(len(data)):
    mytickers.append(data[i]['STOCKTICKER'])
contribution_risk_array = []
for ticker in mytickers:
    contribution_risk_array.append(risk_contributions[ticker]['contribution_percent'])
contribution_risk_array = np.array(contribution_risk_array)
contribution_risk_array

mytickers