process.env["NTBA_FIX_319"] = "1";
import Telegraf, { Button, Buttons } from "telegraf";
const Extra = require("telegraf/extra");
const Markup = require("telegraf/markup");
import { ContextMessageUpdate } from "telegraf";
import * as _ from "lodash";
import { Pool } from "pg";
const TOKEN: string = process.env.TELEGRAM_BOT_TOKEN_TICKETS;
const PORT = parseInt(process.env.PORT) || 443;
const HOST_URL: string = "https://knu-ticket-bot.herokuapp.com";

interface DB_User {
  tg_id: string | null;
  fio: string | null;
  faculty: string | null;
  course: string | null;
  group_num: string | null;
  stud_id: string | null;
}

type fields = "tg_id" | "fio" | "faculty" | "course" | "group_num" | "stud_id";

const users: Set<DB_User> = new Set();

const db = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const reg_btns: Buttons[][] = [[{ text: "Зарегистрироваться" }]];

const start_btns: Buttons[][] = [
  [{ text: "Заказать проездной" }, { text: "Изменить свои данные" }]
];

const bot = new Telegraf(TOKEN);

const pool = new Pool(db);

bot.start((ctx: ContextMessageUpdate) => {
  if (ctx.from.id == ctx.message.chat.id) {
    pool.connect().then(client =>
      client
        .query(`SELECT * FROM students WHERE tgid='${ctx.from.id}'`)
        .then(res => {
          client.release();
          res.rowCount != 0
            ? ctx.reply(
                `Здравствуй, ${res.rows[0].name}`,
                Markup.keyboard(start_btns)
              )
            : ctx.reply(
                `Здравствуй, новый пользователь!`,
                Markup.keyboard(reg_btns)
              );
        })
        .catch(e => {
          client.release();
          console.log(e.stack);
        })
    );
  }
});

bot.hears("Зарегистрироваться", (ctx: ContextMessageUpdate) => {
  ctx.reply("Ваши имя и фамилия:");
  users.add({
    tg_id: String(ctx.from.id),
    fio: null,
    faculty: null,
    course: null,
    group_num: null,
    stud_id: null
  });
});

//фио
bot.hears(/([A-Z][a-z]+ [A-Z][a-z]+)/, (ctx: ContextMessageUpdate) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${ctx.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0) ctx.reply("Вы уже зарегистрированы");
        else setField(ctx.from.id, "fio", ctx.match[1]);
      })
  );
});
//факультет
bot.hears(/([A-Za-z ]+)/, (ctx: ContextMessageUpdate) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${ctx.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0) ctx.reply("Вы уже зарегистрированы");
        else setField(ctx.from.id, "faculty", ctx.match[1]);
      })
  );
});
//курс
bot.hears(/(\d)/, (ctx: ContextMessageUpdate) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${ctx.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0) ctx.reply("Вы уже зарегистрированы");
        else setField(ctx.from.id, "course", ctx.match[1]);
      })
  );
});
//группа
bot.hears(/([A-Z]-\d\d)/, (ctx: ContextMessageUpdate) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${ctx.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0) ctx.reply("Вы уже зарегистрированы");
        else setField(ctx.from.id, "group_num", ctx.match[1]);
      })
  );
});
//студак
bot.hears(/(\d+)/, (ctx: ContextMessageUpdate) => {
  pool.connect().then(client =>
    client
      .query(`SELECT * FROM students WHERE tgid="${ctx.from.id}"`)
      .then(res => {
        client.release();
        if (res.rowCount !== 0) ctx.reply("Вы уже зарегистрированы");
        else setField(ctx.from.id, "stud_id", ctx.match[1]);
      })
      // .query(reg([...users].filter(user => user.tg_id == msg.from.id)[0]))
      // .then(res => {
      //   client.release();
      //   users.forEach(user => {
      //     if (user.tg_id == msg.from.id) users.delete(user);
      //   });
      // })
      .catch(e => {
        client.release();
        console.log("error while inserting new user");
        console.log(e.stack);
        users.forEach(user => {
          if (parseInt(user.tg_id) == ctx.from.id) users.delete(user);
        });
        ctx.reply("Произошла ошибка регистрации, попробуйте позже");
      })
  );
});

bot.hears(/^\/sql (.+)$/, (ctx: ContextMessageUpdate) => {
  if (ctx.from.id == 468074317) {
    pool.connect().then(client =>
      client
        .query(ctx.match[1])
        .then(res => {
          client.release();
          const resp = JSON.stringify(res.rows)
            .replace(/\\n|,|}/g, "\n")
            .replace(/{|\[|\]|"/g, "");
          ctx.reply(resp || "Выполнено!");
        })
        .catch(e => {
          client.release();
          console.log(e.stack);
        })
    );
  }
});

// bot.on("callback_query", cb => {
//   console.log("cb works");
//   const { data } = cb;
//   switch (data) {
//     case "reg":
//       // bot.sendMessage(cb.from.id, "Ваши имя и фамилия:");
//       // users.add({
//       //   tg_id: cb.from.id,
//       //   fio: null,
//       //   faculty: null,
//       //   course: null,
//       //   group_num: null,
//       //   stud_id: null
//       // });
//       //"Введите информацию о себе в формате:\nИмя и фамилия: *Ваши имя и фамилия*\nФакультет: *Ваш факультет*\nКурс: *Ваш курс*\nГруппа: *Ваша группа*\nНомер студенческого билета: *Ваш номер студенческого билета*"
//       break;
//     case "buy_ticket":
//       break;
//     case "change_data":
//       break;
//     default:
//       console.log(data);
//       break;
//   }
// });

bot.launch({
  webhook: {
    domain: HOST_URL,
    port: PORT
  }
});

const reg = (user: DB_User) =>
  `INSERT INTO students VALUES (${user.stud_id}, ${user.tg_id}, ${user.fio}, ${user.faculty}, ${user.course}, ${user.group_num})`;

const setField = (from_id: number, field: fields, val: string): void => {
  _.each([...users], (user: DB_User) => {
    if (parseInt(user.tg_id) == from_id) user[field] = val;
  });
  // users.forEach(user => {
  //   if (parseInt(user.tg_id) == from_id) user[field] = val;
  // });
};

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
