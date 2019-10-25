declare module "telegraf/session";
declare module "telegraf/stage";
declare module "telegraf/scenes/base";
declare module "telegraf/extra";
declare module "telegraf/markup";

type fields = "tg_id" | "fio" | "faculty" | "group_num" | "stud_id";
type scenesNames = "getName" | "getFac" | "getGroup" | "getStudId" | "menu";

interface DBUser {
  tg_id: string | number | undefined;
  fio: string | number | undefined;
  faculty: string | number | undefined;
  group_num: string | number | undefined;
  stud_id: string | number | undefined;
}
interface Product {
  name: string;
  price: number;
  description: string;
  photoUrl: string;
}
