FROM python:3.11-slim

WORKDIR /app

# copy project
COPY . .

# install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# expose ports
EXPOSE 8000
EXPOSE 9000

# run both processes
CMD bash -c "python mcp_server/server.py & uvicorn backend.main:app --host 0.0.0.0 --port 8000"