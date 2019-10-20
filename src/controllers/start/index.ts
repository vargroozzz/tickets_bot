// tslint:disable: quotemark
import { Buttons, ContextMessageUpdate } from "telegraf";
import { Pool } from "pg";
import Stage from "telegraf/stage";
import Scene from "telegraf/scenes/base";
const Extra = require("telegraf/extra");
const Markup = require("telegraf/markup");
const reg_btns: Buttons[][] = [[{ text: "Зарегистрироваться" }]];
const start_btns: Buttons[][] = [
  [{ text: "Заказать проездной" }, { text: "Изменить свои данные" }]
];
const pool = new Pool();

const { leave } = Scene;
const start = new Scene("start");

start
  .enter(async (ctx: ContextMessageUpdate) => {
    const uid = String(ctx.from.id);
    const client = await pool.connect();
    const res = await client.query(
      `SELECT * FROM students WHERE tgid="${uid}"`
    );
    client.release();
    const user = res.rows[0];
    res.rowCount != 0
      ? await ctx.reply(`Здравствуй, ${user.name}`, Markup.keyboard(start_btns))
      : await ctx.reply(
          `Здравствуй, новый пользователь!`,
          Markup.keyboard(reg_btns)
        );
  })
  .catch((e: Error) => console.log(e.stack));
