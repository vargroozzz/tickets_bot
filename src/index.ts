process.env["NTBA_FIX_319"] = "1";
import { Pool } from "pg";
import * as express from "express";
import * as bodyParser from "body-parser";
import { Server } from "ws";

const PORT = process.env.PORT || 3000;

const db = {
  user: "postgres",
  password: process.env.MYSQL_ROOT_PASS,
  database: "tickets",
  host: "http://127.0.0.1",
  port: 52227
  //   connectionString: process.env.BOT_DB_URL
  //    ssl: true
};

const app = express();

const pool: Pool = new Pool(db);

const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get("/", urlencodedParser, (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

app.get("/formparser", urlencodedParser, (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

app.post("/formparser", urlencodedParser, (req, res) => {
  if (
    !("body" in req) ||
    req.body.id == "" ||
    req.body.fio == "" ||
    req.body.group == ""
  )
    return res.sendStatus(400);
  res.send(
    `Ваш id - ${req.body.id}, <br>Ваши имя и фамилия - ${req.body.fio}, <br>Ваша группа - ${req.body.group}`
  );
});

app.listen(PORT, () => {
  console.log(`Listening port ${PORT}`);
});
