process.env["NTBA_FIX_319"] = "1";
const TelegramBot = require("node-telegram-bot-api");
const Pool = require("pg").Pool;

const TOKEN: string = process.env.TELEGRAM_BOT_TOKEN_TICKETS;
const PORT = process.env.PORT || 443;
const HOST_URL: string = "https://knu-ticket-bot.herokuapp.com";

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
    inline_keyboard: [
      [
        { text: "Заказать проездной", callback_data: "buy_ticket" },
        { text: "Изменить свои данные", callback_data: "change_data" }
      ]
    ]
  }
};

const reg_btns = {
  reply_markup: {
    inline_keyboard: [[{ text: "Зарегистрироваться", callback_data: "reg" }]]
  }
};

const bot = new TelegramBot(TOKEN, options);

const pool = new Pool(db);

bot.setWebHook(`${HOST_URL}/bot${TOKEN}`);

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

bot.on("callback_query", cb => {
  const data = cb.data;
  switch (data) {
    case "reg":
      bot.sendMessage(
        cb.from.id,
        "Введите информацию о себе в формате:\nИмя и фамилия: *Ваши имя и фамилия*\nФакультет: *Ваш факультет*\nКурс: *Ваш курс*\nГруппа: *Ваша группа*\nНомер студенческого билета: *Ваш номер студенческого билета*"
      );
      bot.onText(
        /Имя и фамилия: ([A-Z][a-z]+ [A-Z][a-z]+)\nФакультет: ([A-Z][a-z]+ [A-Z][a-z ]+)\nКурс: (\d)\nГруппа: ([A-Z]-\d\d)\nНомер студенческого билета: (\d+)/g,
        (msg, match) => {
          pool.connect().then(client =>
            client
              .query(
                reg(match[1])(match[2])(match[3])(match[4])(match[5])(
                  msg.from.id
                )
              )
              .then(res => {
                client.release();
                bot.onText(
                  /Имя и фамилия: ([A-Z][a-z]+ [A-Z][a-z]+)\nФакультет: ([A-Z][a-z]+ [A-Z][a-z ]+)\nКурс: (\d)\nГруппа: ([A-Z]-\d\d)\nНомер студенческого билета: (\d+)/g,
                  msg => {
                    bot.sendMessage(msg.from.id, "Вы уже зарегистрированы");
                  }
                );
              })
              .catch(e => {
                client.release();
                console.log(e.stack);
              })
          );
        }
      );
      break;
    case "buy_ticket":
      break;
    case "change_data":
      break;
    default:
      console.log(data);
      break;
  }
});

const reg = fio => faculty => course => group_num => studid => user =>
  `INSERT INTO students VALUES (${studid}, ${user.id}, ${fio}, ${faculty}, ${course}, ${group_num})`;

{
  const tables_init: string =
    "CREATE TABLE IF NOT EXISTS students (" +
    "studid INT UNIQUE," +
    "tgid INT UNIQUE," +
    "name_surname TEXT ," +
    "faculty TEXT ," +
    "course TEXT ," +
    "group_num TEXT ," +
    "PRIMARY KEY ( studid ));" +
    "\n" +
    "CREATE TABLE IF NOT EXISTS proforgs (" +
    "studid INT UNIQUE," +
    "tgid INT UNIQUE," +
    "name_surname TEXT ," +
    "course TEXT ," +
    "group_num TEXT ," +
    "PRIMARY KEY ( studid ));";
  pool.connect().then(client =>
    client
      .query(tables_init)
      .then(res => {
        client.release();
        console.log("table was succesfully inited");
      })
      .catch(e => {
        client.release();
        console.log("error by trying to init table");
        console.log(e.stack);
      })
  );
}
