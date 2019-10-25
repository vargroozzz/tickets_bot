process.env["NTBA_FIX_319"] = "1";
import Telegraf, {
  Buttons,
  Markup,
  CallbackButton,
  ContextMessageUpdate as BadMessage,
  PayButton
} from "telegraf";
import Extra from "telegraf/extra";
import Stage from "telegraf/stage";
import session from "telegraf/session";
import Scene from "telegraf/scenes/base";
import * as _ from "lodash";
import { Pool } from "pg";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN_TICKETS;
const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN;
const PORT = parseInt(process.env.PORT) || 443;
const HOST_URL = "https://knu-ticket-bot.herokuapp.com";

interface ContextMessageUpdate extends BadMessage {
  scene: any;
}

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

const chooseCardType = (type: CallbackButton[][]) => async (
  ctx: ContextMessageUpdate
) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(type));
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

const start_btns: string[][] = [["Заказать проездной", "Изменить свои данные"]];
const ticket_types: CallbackButton[][] = [
  [
    Markup.callbackButton("Метро", "metro"),
    Markup.callbackButton("Метро-Автобус", "metro_bus")
  ],
  [
    Markup.callbackButton("Метро-Тролейбус", "metro_troleybus"),
    Markup.callbackButton("Метро-Трамвай", "metro_trum")
  ]
];
const metro: CallbackButton[][] = [
  [Markup.callbackButton("46 поїздок, 145 грн.", "metro__46")],
  [Markup.callbackButton("62 поїздки, 195 грн.", "metro__62")],
  [
    Markup.callbackButton(
      "Необмежена кількість поїздок, 305 грн.",
      "metro__inf"
    )
  ]
];
const metro_bus: CallbackButton[][] = [
  [Markup.callbackButton("46 поїздок, 285 грн.", "metro_bus__46")],
  [Markup.callbackButton("62 поїздки, 335 грн.", "metro_bus__62")],
  [
    Markup.callbackButton(
      "Необмежена кількість поїздок, 430 грн.",
      "metro_bus__inf"
    )
  ]
];
const metro_troleybus: CallbackButton[][] = [
  [Markup.callbackButton("46 поїздок, 285 грн.", "metro_troleybus__46")],
  [Markup.callbackButton("62 поїздки, 335 грн.", "metro_troleybus__62")],
  [
    Markup.callbackButton(
      "Необмежена кількість поїздок, 430 грн.",
      "metro_troleybus__inf"
    )
  ]
];
const metro_trum: CallbackButton[][] = [
  [Markup.callbackButton("46 поїздок, 285 грн.", "metro_trum__46")],
  [Markup.callbackButton("62 поїздки, 335 грн.", "metro_trum__62")],
  [
    Markup.callbackButton(
      "Необмежена кількість поїздок, 430 грн.",
      "metro_trum__inf"
    )
  ]
];
const metro__46: Product = {
  name: "Метро 46 поездок",
  price: 145,
  description: "Проездной в метро на 46 поездок",
  photoUrl: "no photo"
};
const bot = new Telegraf(TOKEN);

bot.use(session());
bot.use(stage.middleware());

const pool = new Pool(db);

bot.start(async (ctx: ContextMessageUpdate) => {
  if (ctx.from.id == ctx.chat.id) {
    pool
      .query(`SELECT * FROM students WHERE tgid='${ctx.from.id}'`)
      .then(res => {
        if (res.rowCount != 0) {
          ctx.reply(
            `Здравствуй, ${res.rows[0].name_surname.split(" ")[1]}`,
            Markup.keyboard(start_btns)
              .resize()
              .extra()
          );
          ctx.scene.enter("menu");
        } else {
          ctx.reply(
            `Здравствуй, новый пользователь!
              Для работы мне нужны некоторые твои данные.Сначала введи свои имя и фармилию:`
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
  pool
    .query(reg(thisUser))
    .then(res => {
      users.delete(thisUser);
      ctx.reply(
        "Вы были успешно зарегистрированы!",
        Markup.keyboard(start_btns)
          .resize()
          .extra()
      );
    })
    .catch(e => {
      console.log("error while inserting new user");
      ctx.reply("Произошла ошибка регистрации, попробуйте позже");
      console.log(e.stack);
      users.delete(thisUser);
    });
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

menu.hears("Заказать проездной", (ctx: ContextMessageUpdate) => {
  ctx.reply(
    "Какой вид вам нужен?",
    Markup.inlineKeyboard(ticket_types)
      .resize()
      .extra()
  );
});

menu.action("metro", chooseCardType(metro));
menu.action("metro__46", async (ctx: ContextMessageUpdate) =>
  ctx.replyWithInvoice(createInvoice(metro__46))
);
menu.action("metro_bus", chooseCardType(metro_bus));
menu.action("metro_troleybus", chooseCardType(metro_troleybus));
menu.action("metro_trum", chooseCardType(metro_trum));

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

const createInvoice = (product: Product) => ({
  provider_token: PAYMENT_TOKEN,
  start_parameter: "foo",
  title: product.name,
  description: product.description,
  currency: "UAH",
  photo_url: product.photoUrl,
  prices: [{ label: product.name, amount: Math.trunc(product.price * 100) }],
  payload: "BLACK FRIDAY"
});

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
