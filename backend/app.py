from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime

app = Flask(__name__)
CORS(app)

def make_vars():
    close_prices = pd.read_csv("close_prices_all.csv", index_col=0, parse_dates=True)
    cov_matrix = pd.read_csv("cov_matrix.csv", index_col=0)

    log_returns = np.log(close_prices / close_prices.shift(1)).dropna()
    mu = log_returns.mean() * 252
    sigma = log_returns.std() * np.sqrt(252)
    epsilon = 1e-4
    cov_matrix_adj = cov_matrix + epsilon * np.eye(cov_matrix.shape[0])
    L = np.linalg.cholesky(cov_matrix_adj.values)
    tickers = close_prices.columns
    n_assets = len(tickers)
    S0 = close_prices.iloc[-1].values

    return tickers, cov_matrix, mu, sigma, L, S0, n_assets

@app.route('/save-data', methods=['POST'])
def save_data():
    data = request.json
    formatted_data = [f"{row['symbol']} {row['date']} {row['value']}" for row in data]

    with open('formatted_data.txt', 'w') as f:
        for line in formatted_data:
            f.write(line + '\n')

    return jsonify({"message": "Data received successfully", "data": data})

def read_stock_data(file_path):
    stock_data = []
    with open(file_path, 'r') as f:
        for line in f:
            parts = line.strip().split(' ')
            if len(parts) == 3:
                ticker, date, value = parts
                try:
                    value = float(value)
                    stock_data.append({
                        'STOCKTICKER': ticker,
                        'DATEBOUGHT': date,
                        'VALUEBOUGHT': value
                    })
                except ValueError:
                    continue
    return stock_data

def dataRead():
    tickers, cov_matrix, mu, sigma, L, S0, n_assets = make_vars()
    data = read_stock_data('formatted_data.txt')

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

    portfolio_values, _ = simulate_gbm_paths(weights, mu, sigma, L, S0, n_assets)
    risk_contributions = portfolio_decomposition(weights, cov_matrix, tickers, portfolio_values)

    mytickers = [entry['TICKER'] for entry in portfolio_data]
    contribution_risk_array = [risk_contributions[t]['contribution_percent'] for t in mytickers]

    flattened_returns = (portfolio_values[:, -1] - portfolio_values[:, 0]) / portfolio_values[:, 0]
    hist_data, bins = np.histogram(flattened_returns, bins=50)
    histogram = {
        "x": bins[:-1].tolist(),
        "y": hist_data.tolist()
    }

    return mytickers, np.array(contribution_risk_array), histogram

@app.route('/get-risk-contributions', methods=['GET'])
def get_risk_contributions():
    try:
        mytickers, contribution_risk_array, histogram = dataRead()
        return jsonify({
            "tickers": mytickers,
            "contributions": contribution_risk_array.tolist(),
            "histogram": histogram
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/simulate_gbm_paths', methods=['GET'])
def simulate_gbm_paths_endpoint():
    try:
        # Generate histogram data
        tickers, cov_matrix, mu, sigma, L, S0, n_assets = make_vars()
        weights = np.ones(n_assets) / n_assets  # Example: Equal weights for all assets
        portfolio_values, _ = simulate_gbm_paths(weights, mu, sigma, L, S0, n_assets)
        hist_data, bins = np.histogram(portfolio_values[:,-1], bins=50)
        histogram = {
            "x": bins[:-1].tolist(),
            "y": hist_data.tolist()
        }

        # Response
        response = {
            "histogram": histogram
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)})
    
def simulate_gbm_paths(weights, mu, sigma, L, S0, n_assets, T=1, N=252, M=1000):
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

def portfolio_decomposition(weights, cov_matrix, tickers, portfolio_values):
    portfolio_variance = np.var(portfolio_values, axis=0).mean()
    weights = np.array(weights)
    asset_variances = np.diag(cov_matrix)
    risk_contributions = {}
    total_risk_contribution = 0

    for i, weight in enumerate(weights):
        mcv_i = np.dot(weights.T, cov_matrix.iloc[i])
        tcv_i = weight * mcv_i
        total_risk_contribution += tcv_i
        risk_contributions[tickers[i]] = {
            'variance': asset_variances[i],
            'contribution_to_risk': tcv_i,
            'contribution_percent': 0
        }

    for asset in risk_contributions:
        tcv_i = risk_contributions[asset]['contribution_to_risk']
        risk_contributions[asset]['contribution_percent'] = 100 * tcv_i / total_risk_contribution

    return risk_contributions
if __name__ == '__main__':
    app.run(debug=True)
