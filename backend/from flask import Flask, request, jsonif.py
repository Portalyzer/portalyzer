from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import yfinance as yf
import datetime as dt
from datetime import datetime
import os

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
data = read_stock_data('backend/formatted_data.txt')
