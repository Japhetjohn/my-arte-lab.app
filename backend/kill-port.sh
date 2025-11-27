#!/bin/bash

# Kill processes running on port 5000 and 8000
PORT_BACKEND=5000
PORT_FRONTEND=8000

echo "Checking for processes on port $PORT_BACKEND..."
PID_BACKEND=$(lsof -t -i:$PORT_BACKEND)

if [ ! -z "$PID_BACKEND" ]; then
  echo "Killing process $PID_BACKEND on port $PORT_BACKEND"
  kill -9 $PID_BACKEND 2>/dev/null
  echo "✅ Port $PORT_BACKEND cleared"
else
  echo "✅ Port $PORT_BACKEND is already free"
fi

echo "Checking for processes on port $PORT_FRONTEND..."
PID_FRONTEND=$(lsof -t -i:$PORT_FRONTEND)

if [ ! -z "$PID_FRONTEND" ]; then
  echo "Killing process $PID_FRONTEND on port $PORT_FRONTEND"
  kill -9 $PID_FRONTEND 2>/dev/null
  echo "✅ Port $PORT_FRONTEND cleared"
else
  echo "✅ Port $PORT_FRONTEND is already free"
fi

echo "✅ All ports cleared, ready to start server"
