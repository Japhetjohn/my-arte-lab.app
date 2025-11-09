#!/bin/bash
# Kill any process using port 5000

echo "🔍 Checking for processes on port 5000..."

if lsof -ti:5000 > /dev/null 2>&1; then
    echo "❌ Port 5000 is in use. Killing process..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    sleep 1

    if lsof -ti:5000 > /dev/null 2>&1; then
        echo "⚠️  Failed to kill process. Try manually:"
        echo "   sudo lsof -ti:5000 | xargs sudo kill -9"
        exit 1
    else
        echo "✅ Port 5000 is now free!"
    fi
else
    echo "✅ Port 5000 is already free!"
fi
