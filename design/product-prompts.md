# Фото товаров SERAFIM → карточки на белом фоне

## Основной способ: бесплатно, локально, принт не портится

Фон вырезает нейросеть прямо на компьютере (`npm run photos`): без подписок, лимитов и водяных знаков.
Вещь **не перерисовывается** — только вырезается, поэтому принт и надписи остаются настоящими.
Дальше скрипт сам ставит её по центру на белый фон 4:5 и добавляет мягкую тень.

### Как снять (5 минут на вещь)

1. **Свет:** днём у окна, но **не под прямым солнцем** (иначе пятна света на ткани, как на главном фото). Без вспышки.
2. **Фон:** любой однотонный, контрастный к вещи — простыня, ватман, пол. Белую вещь — на тёмном, тёмную — на светлом.
3. **Раскладка (flat lay):** разложить ровно, рукава симметрично вдоль тела, чуть согнуть в локтях.
   Руками «взбить» ткань, чтобы был мягкий объём, а не плоская картонка. Капюшон расправить.
   Или повесить на вешалку на ровную стену — тоже работает.
4. **Камера:** строго сверху (встать на стул), телефон параллельно полу, вещь целиком в кадре с запасом.
   Основная камера 1×, не широкоугольная — она искажает форму.
5. Снять **спереди**, перевернуть, так же снять **сзади**.

### Как загрузить

1. Скинуть фото на компьютер и разложить: `photos/<папка товара>/<цвет>-front.jpg` и `<цвет>-back.jpg`
   (названия — в таблице внизу).
2. В терминале в папке проекта: `npm run photos`.
   Первый запуск — пара минут, дальше ~3 секунды на фото. Обрабатываются только новые и изменённые файлы.
3. Обновить сайт в браузере — фото уже там.

Если фото уже готовые на белом фоне (например, из Gemini или от фотографа) — `npm run photos -- --keep-bg`,
тогда фон не вырезается, только размер и сжатие. Переобработать всё заново — `npm run photos -- --all`.

---

# Запасной способ: нейросеть Gemini

Делает «студийнее», но **может испортить принт и надписи** — проверяйте каждую картинку по чек-листу.
Готовые картинки загружать через `npm run photos -- --keep-bg`.

1. **Одна вещь одного цвета = один новый чат** в Gemini (gemini.google.com).
2. Загружаете фото **спереди** + промпт «Спереди». Скачиваете результат кнопкой «Скачать».
3. В **том же чате** — фото **сзади** + промпт «Сзади».
4. Проверяете по чек-листу. Не получилось — промпты-исправления.
   ⚠️ Без реального фото спины нейросеть **придумает** спину — так нельзя.

## Промпт «Спереди» (загрузить фото спереди)

Стиль — **flat lay**: вещь аккуратно разложена и снята сверху, но не плоская, как картонка,
а с мягким объёмом и естественными складками — видно форму кофты и фактуру ткани.

```
Create a premium e-commerce flat lay product photo of the exact garment from the attached photo.

GARMENT — keep it EXACTLY as in the photo: the same cut, proportions, length, color, fabric, seams,
collar or hood, pockets, buttons or zipper, cuffs and hem. Keep the print, embroidery and any lettering
exactly as they are — same image, same words, same position and size. Do not redraw, retype, simplify,
recolor or invent anything.

LAYOUT — FRONT side up, laid out neatly on a flat surface, shot from directly above (top-down, 90°),
perfectly centered and straight. The garment is not ironed flat like cardboard: it has a soft natural
volume, as if lightly filled with air — gentle relaxed folds at the sleeves, waist and around the hood,
showing the shape and the weight of heavy cotton. Sleeves laid symmetrically and relaxed along the body,
slightly bent at the elbows, cuffs neatly turned in. Hood (if any) laid flat and tidy above the collar.
The print sits naturally on the fabric and follows its slight folds — printed into the cotton, matte,
no sticker look.

LIGHT AND BACKGROUND — pure white seamless background (#FFFFFF), edge to edge. Soft diffused daylight
from the upper left, a soft natural contact shadow around the edges of the garment so it lies on the
surface instead of floating. Fine knit texture of the fabric clearly visible. True-to-life colors
exactly as in the original photo, no filters, no color grading.

Only the garment in frame: no hands, hangers, tags, props, text or watermarks. The garment fills about
80% of the frame with even empty margins. Vertical 4:5 aspect ratio, high resolution, photorealistic,
sharp focus.
```

## Промпт «Сзади» (в том же чате, загрузить фото сзади)

```
Now make the matching image of the BACK of the same garment, using the attached photo of its back.

Same flat lay, BACK side up, shot from directly above. Exactly the same scale, position, sleeve layout,
folds style, white background, light and shadow as the front image you just made — the two images must
look like a matching pair. Keep the back print, embroidery, lettering, seams and color exactly as in the
photo; do not invent anything that is not visible in the photo.
Vertical 4:5 aspect ratio, high resolution, photorealistic.
```

## Промпты-исправления (писать в тот же чат)

| Проблема | Что написать |
|---|---|
| Принт / надпись изменились | `The print is wrong. Restore the print and lettering exactly as in the original photo, do not redraw or retype it.` |
| Плоско, как картонка | `Add more natural volume and soft folds, as if the garment is lightly filled with air. It should not look ironed flat.` |
| Наоборот, слишком мято | `Fewer wrinkles: lay it out neater, keep only soft natural folds.` |
| Принт как наклейка | `The print must look printed into the fabric: matte, following the folds, with the knit texture slightly visible through the ink.` |
| Рукава криво / разные | `Lay both sleeves symmetrically, relaxed along the body with a slight bend at the elbows.` |
| Вещь «висит в воздухе» | `Add a soft natural contact shadow around the garment so it lies on the surface.` |
| Цвет «уплыл», слишком ярко | `The color is off. Match the garment color exactly to the original photo, no color grading.` |
| Вещь мелкая / обрезана | `The whole garment must be in frame and fill about 80% of it, centered, with even margins.` |
| Фон сероватый | `Make the background pure white #FFFFFF, edge to edge.` |
| Пара спереди/сзади разная | `Match the size, position, sleeve layout and lighting of this image to the previous (front) image.` |

Результат скачивайте кнопкой **«Скачать»** в Gemini, а не скриншотом — иначе низкое разрешение и артефакты сжатия.

> Всю коллекцию делайте в одном стиле (раскладка, масштаб, свет) — иначе каталог будет выглядеть разношёрстно.
> Удачную пару спереди/сзади можно прикладывать в новые чаты как образец: `Match the style of the attached reference image.`

## Чек-лист перед загрузкой

- [ ] Принт и надписи совпадают с оригиналом **буква в букву**
- [ ] Цвет как в жизни (сравнить с вещью на глаз)
- [ ] Нет лишних пуговиц, карманов, швов, чужих логотипов, «шестого пальца» на рукаве
- [ ] Видна форма вещи: мягкий объём и складки, а не плоская картонка
- [ ] Фон чисто белый, вещь по центру, есть лёгкая тень
- [ ] Спереди и сзади — одного размера и в одном стиле

---

## Куда класть

```
photos/<папка товара>/<цвет>-front.png    ← фото спереди
photos/<папка товара>/<цвет>-back.png     ← фото сзади
```

Формат — png, jpg или webp, размер любой. Скрипт напишет, что загрузилось, а что осталось на заглушках,
и предупредит, если папка или цвет названы неправильно.

### Названия папок и цветов (сейчас в каталоге)

| Товар | Папка | Цвета |
|---|---|---|
| Зип-худи Seraph | `seraph-zip-hoodie` | `blue`, `moss`, `milk` |
| Худи Raised | `raised-hoodie` | `graphite`, `blue` |
| Свитшот Pure Nature | `pure-nature-sweatshirt` | `grey`, `milk` |
| Лонгслив Earth Born | `earth-born-longsleeve` | `milk`, `black` |
| Футболка Ethereal | `ethereal-tee` | `white`, `moss` |
| Футболка Halo | `halo-tee` | `black`, `blue` |
| Штаны Archive | `archive-pants` | `graphite`, `moss` |
| Кепка Seraph | `seraph-cap` | `blue`, `black` |

Пример: `photos/raised-hoodie/graphite-front.png`, `photos/raised-hoodie/graphite-back.png`.

**Если реальных вещей нет в этой таблице** (или названия, цены, цвета другие) — сначала пришлите список:
название, цена, цвета, размеры, состав, что в наличии / предзаказ. Я обновлю каталог и дам названия папок.
