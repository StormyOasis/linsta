#!/bin/bash
# init-elasticsearch.sh

# Start Elasticsearch in the background
echo "Starting Elasticsearch in the background..."
/usr/local/bin/docker-entrypoint.sh elasticsearch &

# Wait for Elasticsearch to start and become reachable
echo "Waiting for Elasticsearch to start..."

# Wait for Elasticsearch to be fully ready (checking for cluster health)
until curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health | grep -q "200"; do
  echo "Waiting for Elasticsearch to be accessible..."
  sleep 5
done

# Wait for Elasticsearch to reach a green state (cluster health)
echo "Elasticsearch is accessible. Waiting for cluster health to be 'green'..."

until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green"'; do
  echo "Waiting for Elasticsearch cluster to reach green status..."
  sleep 5
done

echo "Elasticsearch is fully up and green. Running initialization tasks..."

# Insert test data from the JSON file
echo "Inserting test data into Elasticsearch..."

# Loop through the JSON file and insert each document using grep and awk
cat /test-data.json | grep -o '{.*}' | while read doc; do
  # Insert each document into Elasticsearch
  curl -X POST "http://localhost:9200/test-index/_doc/" -H 'Content-Type: application/json' -d "$doc"
done

echo "Test data inserted."
