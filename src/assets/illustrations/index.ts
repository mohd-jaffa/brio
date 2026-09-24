import type { StaticImageData } from "next/image";

import type { IllustrationKey } from "@/constants/illustrations";

import cakeSquares from "./cake-squares.webp";
import chickGift from "./chick-gift.webp";
import chocoChipMuffin from "./choco-chip-muffin.webp";
import chocoSpongeBar from "./choco-sponge-bar.webp";
import chocolateBar from "./chocolate-bar.webp";
import chocolateCakeSlice from "./chocolate-cake-slice.webp";
import cookieCup from "./cookie-cup.webp";
import cupcake from "./cupcake.webp";
import defaultExpense from "./default-expense.webp";
import defaultProduct from "./default-product.webp";
import deliveryNinja from "./delivery-ninja.webp";
import deliveryScooter from "./delivery-scooter.webp";
import donut from "./donut.webp";
import friedChicken from "./fried-chicken.webp";
import giftBox from "./gift-box.webp";
import giftBoxPink from "./gift-box-pink.webp";
import glazedCake from "./glazed-cake.webp";
import goldCoins from "./gold-coins.webp";
import heartBalloons from "./heart-balloons.webp";
import heartGiftBox from "./heart-gift-box.webp";
import pudding from "./pudding.webp";
import roseBouquet from "./rose-bouquet.webp";
import roseBunch from "./rose-bunch.webp";
import shoppingBags from "./shopping-bags.webp";
import strawberryCake from "./strawberry-cake.webp";
import strawberryCakeSlice from "./strawberry-cake-slice.webp";
import taco from "./taco.webp";
import teddyBear from "./teddy-bear.webp";

/**
 * Each illustration's image, built from artwork/illustrations by
 * scripts/illustrations.mjs (plan §139.11.10). Imported statically, so a
 * missing file fails the build and every URL is hashed and cached for good.
 */
export const ILLUSTRATION_IMAGES: Record<IllustrationKey, StaticImageData> = {
  "default-product": defaultProduct,
  "default-expense": defaultExpense,
  "gold-coins": goldCoins,
  "shopping-bags": shoppingBags,
  "delivery-scooter": deliveryScooter,
  "delivery-ninja": deliveryNinja,
  "donut": donut,
  "cupcake": cupcake,
  "choco-chip-muffin": chocoChipMuffin,
  "chocolate-cake-slice": chocolateCakeSlice,
  "strawberry-cake-slice": strawberryCakeSlice,
  "strawberry-cake": strawberryCake,
  "glazed-cake": glazedCake,
  "pudding": pudding,
  "cake-squares": cakeSquares,
  "cookie-cup": cookieCup,
  "chocolate-bar": chocolateBar,
  "choco-sponge-bar": chocoSpongeBar,
  "gift-box": giftBox,
  "gift-box-pink": giftBoxPink,
  "heart-gift-box": heartGiftBox,
  "teddy-bear": teddyBear,
  "rose-bouquet": roseBouquet,
  "rose-bunch": roseBunch,
  "heart-balloons": heartBalloons,
  "chick-gift": chickGift,
  "fried-chicken": friedChicken,
  "taco": taco,
};
