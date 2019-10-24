process.env["NTBA_FIX_319"] = "1";
import Telegraf, {
  Buttons,
  ContextMessageUpdate as BadMessage
} from "telegraf";
import Extra from "telegraf/extra";
import Markup from "telegraf/markup";
import Stage from "telegraf/stage";
import session from "telegraf/session";
import Scene from "telegraf/scenes/base";
import * as _ from "lodash";
import { Pool, Client } from "pg";
const TOKEN: string = process.env.TELEGRAM_BOT_TOKEN_TICKETS;
const PORT = parseInt(process.env.PORT) || 443;
const HOST_URL: string = "https://knu-ticket-bot.herokuapp.com";

interface DBUser {
  tg_id: string | number | undefined;
  fio: string | number | undefined;
  faculty: string | number | undefined;
  group_num: string | number | undefined;
  stud_id: string | number | undefined;
}

interface ContextMessageUpdate extends BadMessage {
  scene: any;
}

type fields = "tg_id" | "fio" | "faculty" | "group_num" | "stud_id";
type scenesNames = "getName" | "getFac" | "getGroup" | "getStudId" | "menu";

const begin = (scene: scenesNames) => async (ctx: ContextMessageUpdate) => {
  ctx.reply("Начнем заново. Введите имя и фамилию");
  users.delete(findUserByTgid(ctx.from.id));
  users.add({
    tg_id: ctx.from.id,
    fio: undefined,
    faculty: undefined,
    group_num: undefined,
    stud_id: undefined
  });
  await ctx.scene.leave(scene);
  ctx.scene.enter("getName");
};

const stage = new Stage();

const getName = new Scene("getName");
stage.register(getName);
const getFac = new Scene("getFac");
stage.register(getFac);
const getGroup = new Scene("getGroup");
stage.register(getGroup);
const getStudId = new Scene("getStudId");
stage.register(getStudId);
const menu = new Scene("menu");
stage.register(menu);

const users: Set<DBUser> = new Set();

const db = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const start_btns: Buttons[][] = [
  [{ text: "Заказать проездной" }, { text: "Изменить свои данные" }]
];

const bot = new Telegraf(TOKEN);

bot.use(session());
bot.use(stage.middleware());

const pool = new Pool(db);

bot.start((ctx: ContextMessageUpdate) => {
  if (ctx.from.id == ctx.chat.id) {
    pool
      .query(`SELECT * FROM students WHERE tgid='${ctx.from.id}'`)
      .then(res => {
        console.log("query is working");
        if (res.rowCount != 0) {
          ctx.reply(
            `Здравствуй, ${res.rows[0].name}`,
            Markup.keyboard(start_btns)
          );
          ctx.scene.enter("menu");
        } else {
          ctx.reply(
            `Здравствуй, новый пользователь!
              Для работы мне нужны некоторые твои данные.Сначала введи свои имя и фармилию:`,
            { reply_markup: { remove_keyboard: true } }
          );
          ctx.scene.enter("getName");
          users.add({
            tg_id: ctx.from.id,
            fio: undefined,
            faculty: undefined,
            group_num: undefined,
            stud_id: undefined
          });
        }
      })
      .catch(e => {
        console.log(e.stack);
      });
  }
});

// фио
getName.command("start", begin("getName"));
getName.hears(
  /([А-Я][а-я]+ [А-Я][а-я]+)/,
  async (ctx: ContextMessageUpdate) => {
    setField(ctx.from.id, "fio", ctx.match[1]);
    ctx.reply(
      "Хорошо, а теперь официальное название факультета, на котором ты учишься:"
    );
    await ctx.scene.leave("getName");
    ctx.scene.enter("getFac");
  }
);
getName.on("text", async (ctx: ContextMessageUpdate) => {
  ctx.reply("Введите свои имя и фамилию");
});
// факультет
getFac.command("start", begin("getFac"));
getFac.hears(/([А-Яа-я ]+)/g, async (ctx: ContextMessageUpdate) => {
  setField(ctx.from.id, "faculty", ctx.match[1]);
  ctx.reply("Название группы:");
  await ctx.scene.leave("getFac");
  ctx.scene.enter("getGroup");
});
getFac.on("text", async (ctx: ContextMessageUpdate) => {
  ctx.reply("Введите название своего факультета");
});
// группа
getGroup.command("start", begin("getGroup"));
getGroup.hears(/([А-Я]-\d\d)/, async (ctx: ContextMessageUpdate) => {
  setField(ctx.from.id, "group_num", ctx.match[1]);
  ctx.reply(
    "А теперь самое главное: номер твоего студенческого билета, чтобы убедиться что ты не фейк:"
  );
  await ctx.scene.leave("getGroup");
  ctx.scene.enter("getStudId");
});
getGroup.on("text", async (ctx: ContextMessageUpdate) => {
  ctx.reply("Введите название своей группы");
});
// студак
getGroup.command("start", begin("getStudId"));
getStudId.hears(/(\d+)/, async (ctx: ContextMessageUpdate) => {
  setField(ctx.from.id, "stud_id", Number(ctx.match[1]));
  const thisUser = findUserByTgid(ctx.from.id);
  console.log(thisUser);
  pool
    .query(reg(thisUser))
    .then(res => {
      users.delete(thisUser);
      ctx.reply(
        "Вы были успешно зарегистрированы!",
        Extra.keyboard(start_btns)
      );
    })
    .catch(e => {
      console.log("error while inserting new user");
      ctx.reply("Произошла ошибка регистрации, попробуйте позже");
      console.log(e.stack);
      users.delete(thisUser);
    });
});
getStudId.hears(/^\/sql (.+)$/, (ctx: ContextMessageUpdate) => {
  if (ctx.from.id == 468074317) {
    pool
      .query(ctx.match[1])
      .then(async res => {
        const resp = JSON.stringify(res.rows)
          .replace(/\\n|,|}/g, "\n")
          .replace(/{|\[|\]|"/g, "");
        ctx.reply(resp || "Выполнено!");
        await ctx.scene.leave("getFac");
      })
      .catch(e => {
        console.log(e.stack);
      });
  }
});
getStudId.on("text", async (ctx: ContextMessageUpdate) => {
  ctx.reply("Введите номер своего студенческого билета");
});

bot.hears(/^\/sql (.+)$/, (ctx: ContextMessageUpdate) => {
  if (ctx.from.id == 468074317) {
    pool
      .query(ctx.match[1])
      .then(res => {
        const resp = JSON.stringify(res.rows)
          .replace(/\\n|,|}/g, "\n")
          .replace(/{|\[|\]|"/g, "");
        ctx.reply(resp || "Выполнено!");
      })
      .catch(e => {
        console.log(e.stack);
      });
  }
});

// bot.on("callback_query", ctx => {
//   console.log("cb works");
//   const { data } = ctx;
//   switch (data) {
//     case "reg":
//       // ctx.reply(ctx.from.id, "Ваши имя и фамилия:");
//       // users.add({
//       //   tg_id: ctx.from.id,
//       //   fio: undefined,
//       //   faculty: undefined,
//       //   group_num: undefined,
//       //   stud_id: undefined
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

const reg = (user: DBUser) =>
  `INSERT INTO students(studid,tgid,name_surname,faculty,group_num) VALUES ('${user.stud_id}', '${user.tg_id}', '${user.fio}', '${user.faculty}', '${user.group_num}')`;

const setField = (from_id: number, field: fields, val: string | number) => {
  const user = findUserByTgid(from_id);
  user[field] = val;
};

const search = (set: Set<DBUser>) => (field: fields) => (
  val: string | number
): DBUser => [...set].filter(user => user[field] == val)[0];
const findUser = search(users);
const findUserByTgid = findUser("tg_id");

{
  const tables_init: string =
    "CREATE TABLE IF NOT EXISTS students (" +
    "studid INT UNIQUE," +
    "tgid INT UNIQUE," +
    "name_surname TEXT ," +
    "faculty TEXT ," +
    "group_num TEXT ," +
    "PRIMARY KEY ( studid ));" +
    "\n" +
    "CREATE TABLE IF NOT EXISTS proforgs (" +
    "studid INT UNIQUE," +
    "tgid INT UNIQUE," +
    "name_surname TEXT ," +
    "group_num TEXT ," +
    "PRIMARY KEY ( studid ));";
  pool
    .query(tables_init)
    .then(res => {
      console.log("table was succesfully inited");
    })
    .catch(e => {
      console.log("error by trying to init table");
      console.log(e.stack);
    });
}
