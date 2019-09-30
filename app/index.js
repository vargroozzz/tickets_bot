"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env["NTBA_FIX_319"] = "1";
var pg_1 = require("pg");
var express = require("express");
var bodyParser = require("body-parser");
var PORT = process.env.PORT || 3000;
var db = {
    user: "postgres",
    password: process.env.MYSQL_ROOT_PASS,
    database: "tickets",
    host: "http://127.0.0.1",
    port: 52227
};
var app = express();
var pool = new pg_1.Pool(db);
var urlencodedParser = bodyParser.urlencoded({ extended: false });
app.get("/", urlencodedParser, function (req, res) {
    res.sendFile(__dirname + "/index.html");
});
app.get("/formparser", urlencodedParser, function (req, res) {
    res.sendFile(__dirname + "/index.html");
});
app.post("/formparser", urlencodedParser, function (req, res) {
    if (!("body" in req) ||
        req.body.id == "" ||
        req.body.fio == "" ||
        req.body.group == "")
        return res.sendStatus(400);
    res.send("\u0412\u0430\u0448 id - " + req.body.id + ", <br>\u0412\u0430\u0448\u0438 \u0438\u043C\u044F \u0438 \u0444\u0430\u043C\u0438\u043B\u0438\u044F - " + req.body.fio + ", <br>\u0412\u0430\u0448\u0430 \u0433\u0440\u0443\u043F\u043F\u0430 - " + req.body.group);
});
app.listen(PORT, function () {
    console.log("Listening port " + PORT);
});
