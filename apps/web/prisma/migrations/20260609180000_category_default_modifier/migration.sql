-- Категория для группировки позиций в конструкторе («Коктейли», «Кофе», ...).
ALTER TABLE "Base" ADD COLUMN "category" TEXT;

-- Модификатор, помеченный «по умолчанию выбран» — для предзаполненных позиций
-- («Айс-латте» сразу с сиропом «Ваниль» и т.п.).
ALTER TABLE "Modifier" ADD COLUMN "defaultSelected" BOOLEAN NOT NULL DEFAULT false;
