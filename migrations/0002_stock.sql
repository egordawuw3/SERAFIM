-- Остатки по артикулам (SKU цвета + размер): сколько штук ещё можно заказать. Заказ списывает остаток,
-- на нуле размер на сайте — «нет в наличии». Артикулов без строки (рюкзак) учёт не касается.
-- Поменять остаток: UPDATE stock SET qty = 10 WHERE sku = 'SRF/HD/ONLYWAY/GREY/M';
CREATE TABLE stock (
  sku TEXT PRIMARY KEY,
  qty INTEGER NOT NULL CHECK (qty >= 0)
);

INSERT INTO stock (sku, qty) VALUES
  -- Худи Salvation (без заплаток)
  ('SRF/HD/SALVATION/GREY/S', 3), ('SRF/HD/SALVATION/GREY/M', 6), ('SRF/HD/SALVATION/GREY/L', 4), ('SRF/HD/SALVATION/GREY/XL', 2),
  -- Худи If she not from God (красные заплатки)
  ('SRF/HD/FROMGOD/GREY/S', 3), ('SRF/HD/FROMGOD/GREY/M', 6), ('SRF/HD/FROMGOD/GREY/L', 4), ('SRF/HD/FROMGOD/GREY/XL', 2),
  -- Худи The only way (голубые заплатки)
  ('SRF/HD/ONLYWAY/GREY/S', 3), ('SRF/HD/ONLYWAY/GREY/M', 7), ('SRF/HD/ONLYWAY/GREY/L', 4), ('SRF/HD/ONLYWAY/GREY/XL', 2),
  -- Регбийка I will attract
  ('SRF/RG/IWILL/BLUE/S', 7), ('SRF/RG/IWILL/BLUE/M', 8), ('SRF/RG/IWILL/BLUE/L', 4), ('SRF/RG/IWILL/BLUE/XL', 2);
