# filepath: backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS to allow communication with the React frontend

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



if __name__ == '__main__':
    app.run(debug=True)