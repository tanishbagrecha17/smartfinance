#include "crow_all.h"
#include <vector>
#include <string>
#include <mutex>
#include <algorithm>
#include <iostream>
#include <cstdlib>

struct Transaction {
    int id;
    std::string type;
    double amount;
    std::string category;
    std::string note;
    std::string date;
};

std::vector<Transaction> transactions;
std::mutex txn_mutex;
int next_id = 1;

void seed_data() {
    transactions = {
        {next_id++, "income",  5000, "Other",        "Monthly salary",         "2025-03-01"},
        {next_id++, "expense", 1200, "Rent",         "Apartment rent",         "2025-03-02"},
        {next_id++, "expense",  340, "Food",         "Groceries & dining",     "2025-03-05"},
        {next_id++, "income",   800, "Other",        "Freelance project",      "2025-03-10"},
        {next_id++, "expense",   90, "Transport",    "Monthly pass",           "2025-03-11"},
        {next_id++, "expense",  220, "Entertainment","Subscriptions + movies", "2025-03-15"},
        {next_id++, "expense",  150, "Health",       "Gym + supplements",      "2025-03-18"},
        {next_id++, "expense",  480, "Shopping",     "New headphones",         "2025-03-22"},
        {next_id++, "income",   300, "Other",        "Dividend payout",        "2025-04-01"},
        {next_id++, "expense",  200, "Utilities",    "Electricity & internet", "2025-04-03"},
    };
}

crow::json::wvalue to_json(const Transaction& t) {
    crow::json::wvalue j;
    j["id"] = t.id;
    j["type"] = t.type;
    j["amount"] = t.amount;
    j["category"] = t.category;
    j["note"] = t.note;
    j["date"] = t.date;
    return j;
}

void add_cors(crow::response& res) {
    res.add_header("Access-Control-Allow-Origin", "*");
    res.add_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.add_header("Access-Control-Allow-Headers", "Content-Type");
}

int main() {
    seed_data();
    crow::SimpleApp app;

    // OPTIONS /api/transactions
    CROW_ROUTE(app, "/api/transactions")
    .methods("OPTIONS"_method)
    ([]() {
        crow::response res(204);
        add_cors(res);
        return res;
    });

    // OPTIONS /api/transactions/<id>
    CROW_ROUTE(app, "/api/transactions/<int>")
    .methods("OPTIONS"_method)
    ([](int) {
        crow::response res(204);
        add_cors(res);
        return res;
    });

    // GET /api/transactions
    CROW_ROUTE(app, "/api/transactions")
    .methods("GET"_method)
    ([]() {
        std::lock_guard<std::mutex> lock(txn_mutex);

        std::vector<crow::json::wvalue> arr;
        for (const auto& t : transactions) {
            arr.push_back(to_json(t));
        }

        crow::json::wvalue result;
        result["transactions"] = std::move(arr);

        crow::response res(200, result.dump());
        res.add_header("Content-Type", "application/json");
        add_cors(res);
        return res;
    });

    // POST /api/transactions
    CROW_ROUTE(app, "/api/transactions")
    .methods("POST"_method)
    ([](const crow::request& req) {
        auto body = crow::json::load(req.body);

        if (!body || !body.has("type") || !body.has("amount")) {
            crow::response res(400, R"({"error":"Missing required fields: type, amount"})");
            res.add_header("Content-Type", "application/json");
            add_cors(res);
            return res;
        }

        std::lock_guard<std::mutex> lock(txn_mutex);

        Transaction t;
        t.id = next_id++;
        t.type = std::string(body["type"].s());
        t.amount = body["amount"].d();
        t.category = body.has("category") ? std::string(body["category"].s()) : "Other";
        t.note = body.has("note") ? std::string(body["note"].s()) : "";
        t.date = body.has("date") ? std::string(body["date"].s()) : "";

        transactions.push_back(t);

        crow::json::wvalue saved = to_json(t);
        crow::response res(201, saved.dump());
        res.add_header("Content-Type", "application/json");
        add_cors(res);
        return res;
    });

    // DELETE /api/transactions/<id>
    CROW_ROUTE(app, "/api/transactions/<int>")
    .methods("DELETE"_method)
    ([](int id) {
        std::lock_guard<std::mutex> lock(txn_mutex);

        auto it = std::find_if(
            transactions.begin(),
            transactions.end(),
            [id](const Transaction& t) { return t.id == id; }
        );

        if (it == transactions.end()) {
            crow::response res(404, R"({"error":"Transaction not found"})");
            res.add_header("Content-Type", "application/json");
            add_cors(res);
            return res;
        }

        transactions.erase(it);

        crow::response res(200, R"({"message":"Deleted successfully"})");
        res.add_header("Content-Type", "application/json");
        add_cors(res);
        return res;
    });

    // GET /api/summary
    CROW_ROUTE(app, "/api/summary")
    .methods("GET"_method)
    ([]() {
        std::lock_guard<std::mutex> lock(txn_mutex);

        double income = 0.0, expense = 0.0;
        for (const auto& t : transactions) {
            if (t.type == "income") income += t.amount;
            else expense += t.amount;
        }

        crow::json::wvalue result;
        result["totalIncome"] = income;
        result["totalExpense"] = expense;
        result["balance"] = income - expense;

        crow::response res(200, result.dump());
        res.add_header("Content-Type", "application/json");
        add_cors(res);
        return res;
    });

    CROW_ROUTE(app, "/")
    ([]() {
        crow::response res("Smart Finance Tracker backend is running!");
        add_cors(res);
        return res;
    });

   int port = 18080;
if (const char* p = std::getenv("PORT")) {
    port = std::stoi(p);
}

std::cout << "Backend running on port " << port << "\n";
app.port(port).multithreaded().run();
}