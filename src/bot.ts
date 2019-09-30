process.env["NTBA_FIX_319"] = "1";
import * as TelegramBot from "node-telegram-bot-api";
import { Pool } from "pg";

const TOKEN: string = process.env.TELEGRAM_BOT_TOKEN_TICKETS;
const PORT = process.env.PORT || 443;
const URL: string = "https://";

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
    keyboard: [[]],
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

bot.onText(/^\/start$/, msg => {
  if (msg.from.id == msg.chat.id) {
    pool.connect().then(client => {
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
        });
    });
  }
});
