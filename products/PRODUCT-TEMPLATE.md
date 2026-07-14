# Product Intake Template — Taj Al Ameera VIP

> Fill one block per product. Everything here maps directly to Salla fields so posting is copy-paste fast.
> Copy the **BLANK TEMPLATE** block for each new product. Filled example at bottom.

## Field → Salla mapping
| Field here | Salla field | Notes |
|---|---|---|
| Name (AR) | `name` | Arabic title. Include karat in name: `خاتم ذهب عيار 21` |
| Name (EN) | product name (EN) | optional English mirror |
| Description | product description | rich text, sells the piece |
| Weight (g) | `weight_label` + custom | e.g. `5.20` grams — drives price |
| Karat / عيار | in name + SKU | 24 / 21 / 18 |
| Gold color | name / variant option | yellow / white / rose |
| SKU | `sku` | encode: `R-21Y-0520` = Ring 21k Yellow 5.20g |
| Category | Salla category | Rings / Chains / Bracelets / Kids / Gold Bars |
| Stones | description | type, count, carat |
| Making charge (أجرة صنعة) | added on top | SAR per gram OR fixed SAR — this is the "cost on top" |
| Final price | `price` | = (live gram price × weight) + making charge |
| Hero image | `image.url` | Gemini AI image (see GEMINI-PHOTO-WORKFLOW.md) |
| Reference photo | — | your real product-1 shot |
| Quantity | `quantity` | stock count |

## Price formula
```
final_price = (gram_price_for_karat × weight_grams) + making_charge_total
```
- `gram_price_for_karat` = live from gold-proxy (24k/21k/18k SAR per gram)
- `making_charge_total` = making_charge_per_gram × weight  OR  fixed amount
- The making charge is the ONLY cost you add on top of raw gold value.

---

## BLANK TEMPLATE (copy per product)

```
### PRODUCT #___
- Name (AR):
- Name (EN):
- Category:         [ Rings | Chains | Bracelets | Kids | Gold Bars ]
- Karat (عيار):     [ 24 | 21 | 18 ]
- Gold color:       [ yellow | white | rose ]
- Weight (g):
- SKU:
- Stones:           [ none | type / count / carat ]
- Making charge:    [ ___ SAR/gram | ___ SAR fixed ]
- Quantity:
- Description (AR):

- Reference photo:  [ path/link to real shot ]
- Gemini AI image:  [ path/link to generated hero ]
- Status:           [ draft | photo-done | ready | posted ]
```

---

## FILLED EXAMPLE (delete before real use)

```
### PRODUCT #1
- Name (AR):        خاتم ذهب عيار 21 أصفر
- Name (EN):        21k Yellow Gold Ring
- Category:         Rings
- Karat (عيار):     21
- Gold color:       yellow
- Weight (g):       5.20
- SKU:              R-21Y-0520
- Stones:           none
- Making charge:    35 SAR/gram   (= 182 SAR total on 5.20g)
- Quantity:         1
- Description (AR): خاتم ذهب فاخر عيار 21، تصميم عصري ناعم يناسب الإطلالة اليومية.
                    وزن 5.20 جرام، ذهب أصفر لامع. أناقة تُلبس كل يوم.
- Reference photo:  products/ref/ring-1.jpg
- Gemini AI image:  products/ai/ring-1-hero.webp
- Status:           ready
```
