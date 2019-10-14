process.env["NTBA_FIX_319"] = "1";
const TelegramBot = require("node-telegram-bot-api");
const Pool = require("pg").Pool;

const TOKEN: string = process.env.TELEGRAM_BOT_TOKEN_TICKETS;
const PORT = process.env.PORT || 443;
const HOST_URL: string = "https://knu-ticket-bot.herokuapp.com";

interface User {
  tg_id: number | null;
  fio: string | null;
  faculty: string | null;
  course: number | null;
  group_num: string | null;
  stud_id: number | null;
}

const users: Set<User> = new Set();

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
//фио
bot.onText(/([A-Z][a-z]+ [A-Z][a-z]+)/, (msg, match) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${msg.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0)
          bot.sendMessage(msg.from.id, "Вы уже зарегистрированы");
        else
          users.forEach(user => {
            if (user.tg_id == msg.from.id) user.fio = match[1];
          });
      })
  );
});
//факультет
bot.onText(/([A-Za-z ]+)/, (msg, match) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${msg.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0)
          bot.sendMessage(msg.from.id, "Вы уже зарегистрированы");
        else
          users.forEach(user => {
            if (user.tg_id == msg.from.id) user.faculty = match[1];
          });
      })
  );
});
//курс
bot.onText(/(\d)/, (msg, match) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${msg.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0)
          bot.sendMessage(msg.from.id, "Вы уже зарегистрированы");
        else
          users.forEach(user => {
            if (user.tg_id == msg.from.id) user.course = match[1];
          });
      })
  );
});
//группа
bot.onText(/([A-Z]-\d\d)/, (msg, match) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${msg.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0)
          bot.sendMessage(msg.from.id, "Вы уже зарегистрированы");
        else
          users.forEach(user => {
            if (user.tg_id == msg.from.id) user.group_num = match[1];
          });
      })
  );
});
//студак
bot.onText(/(\d+)/, (msg, match) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${msg.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0)
          bot.sendMessage(msg.from.id, "Вы уже зарегистрированы");
        else
          users.forEach(user => {
            if (user.tg_id == msg.from.id) user.stud_id = match[1];
          });
      })
      .query(reg([...users].filter(user => user.tg_id == msg.from.id)[0]))
      .then(res => {
        client.release();
        users.forEach(user => {
          if (user.tg_id == msg.from.id) users.delete(user);
        });
      })
      .catch(e => {
        client.release();
        console.log("error while inserting new user");
        console.log(e.stack);
        users.forEach(user => {
          if (user.tg_id == msg.from.id) users.delete(user);
        });
        bot.sendMessage(
          msg.from.id,
          "Произошла ошибка регистрации, попробуйте позже"
        );
      })
  );
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
  const { data } = cb;
  switch (data) {
    case "reg":
      bot.sendMessage(cb.from.id, "Ваши имя и фамилия:");
      users.add({
        tg_id: cb.from.id,
        fio: null,
        faculty: null,
        course: null,
        group_num: null,
        stud_id: null
      });
      //"Введите информацию о себе в формате:\nИмя и фамилия: *Ваши имя и фамилия*\nФакультет: *Ваш факультет*\nКурс: *Ваш курс*\nГруппа: *Ваша группа*\nНомер студенческого билета: *Ваш номер студенческого билета*"
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

const reg = (user: User) =>
  `INSERT INTO students VALUES (${user.stud_id}, ${user.tg_id}, ${user.fio}, ${user.faculty}, ${user.course}, ${user.group_num})`;

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
