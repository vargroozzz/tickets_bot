process.env["NTBA_FIX_319"] = "1";
import * as TelegramBot from "node-telegram-bot-api";
import { Pool } from "pg";

const TOKEN: string = process.env.TELEGRAM_BOT_TOKEN_TICKETS;
const PORT = process.env.PORT || 443;
const URL: string = "https://knu-ticket-bot.herokuapp.com";

const options = {
  webHook: {
    port: PORT
  }
};

const db = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const start_btns = {
  reply_markup: {
    keyboard: [["Заказать проездной", "Изменить свои данные"]],
    resize_keyboard: true
  }
};

const reg_btns = {
  reply_markup: {
    keyboard: [["Зарегистрироваться"]],
    resize_keyboard: true
  }
};

const bot: TelegramBot = new TelegramBot(TOKEN, options);

const pool: Pool = new Pool(db);

bot.setWebHook(`${URL}/bot${TOKEN}`);
console.log(`${URL}/bot${TOKEN}`);
bot.onText(/^\/start$/, msg => {
  if (msg.from.id == msg.chat.id) {
    pool.connect().then(client =>
      client
        .query(`SELECT * FROM students WHERE tgid='${msg.from.id}'`)
        .then(res => {
          client.release();
          res.rows != 0
            ? bot.sendMessage(
                msg.from.id,
                `Здравствуй, ${res.rows[0].name}`,
                start_btns
              )
            : bot.sendMessage(
                msg.from.id,
                `Здравствуй, новый пользователь!`,
                reg_btns
              );
        })
        .catch(e => {
          client.release();
          console.log(e.stack);
        })
    );
  }
});

bot.onText(/^\/sql (.+)$/, (msg, match) => {
  if (msg.from.id == 468074317) {
    pool.connect().then(client =>
      client
        .query(match[1])
        .then(res => {
          client.release();
          const resp = JSON.stringify(res.rows)
            .replace(/\\n|,|}/g, "\n")
            .replace(/{|\[|\]|"/g, "");
          bot.sendMessage(msg.from.id, resp || "Выполнено!");
        })
        .catch(e => {
          client.release();
          console.log(e.stack);
        })
    );
  }
});

{
  const tables_init: string =
    "CREATE TABLE IF NOT EXISTS students (" +
    "studid INT UNIQUE," +
    "tgid INT UNIQUE," +
    "course TEXT ," +
    "group TEXT ," +
    "name_surname TEXT ," +
    "PRIMARY KEY ( studid ));" +
    "\n" +
    "CREATE TABLE IF NOT EXISTS proforgs (" +
    "studid INT UNIQUE," +
    "tgid INT UNIQUE," +
    "course TEXT ," +
    "group TEXT ," +
    "name_surname TEXT ," +
    "PRIMARY KEY ( studid ));";
  pool.connect().then(client =>
    client
      .query(tables_init)
      .then(res => {
        client.release();
      })
      .catch(e => {
        client.release();
        console.log(e.stack);
      })
  );
}
