FROM ubuntu:24.04

RUN apt-get update && apt-get install -y g++ make && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN g++ -std=c++17 main.cpp -o app -I . -lpthread

EXPOSE 18080

CMD ["./app"]