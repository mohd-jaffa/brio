import type { StaticImageData } from "next/image";

import type { IllustrationKey } from "@/constants/illustrations";

import astronautBuilder from "./astronaut-builder.webp";
import bowAndArrow from "./bow-and-arrow.webp";
import cakeSquares from "./cake-squares.webp";
import capybaraDuck from "./capybara-duck.webp";
import capybaraHeadphones from "./capybara-headphones.webp";
import chickGift from "./chick-gift.webp";
import chocoChipMuffin from "./choco-chip-muffin.webp";
import chocoSpongeBar from "./choco-sponge-bar.webp";
import chocolateBar from "./chocolate-bar.webp";
import chocolateCakeSlice from "./chocolate-cake-slice.webp";
import chocolateHeart from "./chocolate-heart.webp";
import cookieCup from "./cookie-cup.webp";
import crownedHeart from "./crowned-heart.webp";
import cupcake from "./cupcake.webp";
import cupid from "./cupid.webp";
import defaultExpense from "./default-expense.webp";
import defaultProduct from "./default-product.webp";
import deliveryNinja from "./delivery-ninja.webp";
import deliveryScooter from "./delivery-scooter.webp";
import doctor from "./doctor.webp";
import doctorGerms from "./doctor-germs.webp";
import donut from "./donut.webp";
import dragonGamer from "./dragon-gamer.webp";
import friedChicken from "./fried-chicken.webp";
import giftBox from "./gift-box.webp";
import giftBoxPink from "./gift-box-pink.webp";
import giftBoxRed from "./gift-box-red.webp";
import giftBoxWhiteBow from "./gift-box-white-bow.webp";
import giftStack from "./gift-stack.webp";
import giraffeCar from "./giraffe-car.webp";
import glazedCake from "./glazed-cake.webp";
import goldCoins from "./gold-coins.webp";
import grandmaCooking from "./grandma-cooking.webp";
import hamsterDaisies from "./hamster-daisies.webp";
import heart from "./heart.webp";
import heartBalloons from "./heart-balloons.webp";
import heartGiftBox from "./heart-gift-box.webp";
import heartPadlock from "./heart-padlock.webp";
import heartPink from "./heart-pink.webp";
import laceHeart from "./lace-heart.webp";
import lightBulb from "./light-bulb.webp";
import loveLetter from "./love-letter.webp";
import loveLocks from "./love-locks.webp";
import mopBucket from "./mop-bucket.webp";
import popcorn from "./popcorn.webp";
import pudding from "./pudding.webp";
import puppyFlowers from "./puppy-flowers.webp";
import ribbonBow from "./ribbon-bow.webp";
import roseBouquet from "./rose-bouquet.webp";
import roseBunch from "./rose-bunch.webp";
import savingsJar from "./savings-jar.webp";
import sharkFloat from "./shark-float.webp";
import shoppingBags from "./shopping-bags.webp";
import strawberryCake from "./strawberry-cake.webp";
import strawberryCakeSlice from "./strawberry-cake-slice.webp";
import taco from "./taco.webp";
import teddyBear from "./teddy-bear.webp";
import twoHearts from "./two-hearts.webp";
import xoxoHeart from "./xoxo-heart.webp";

/**
 * Each illustration's image, built from artwork/illustrations by
 * scripts/illustrations.mjs (plan §139.11.10). Imported statically, so a
 * missing file fails the build and every URL is hashed and cached for good.
 */
export const ILLUSTRATION_IMAGES: Record<IllustrationKey, StaticImageData> = {
  "default-product": defaultProduct,
  "default-expense": defaultExpense,
  "gold-coins": goldCoins,
  "savings-jar": savingsJar,
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
  "gift-box-red": giftBoxRed,
  "gift-box-white-bow": giftBoxWhiteBow,
  "gift-stack": giftStack,
  "ribbon-bow": ribbonBow,
  "puppy-flowers": puppyFlowers,
  "hamster-daisies": hamsterDaisies,
  "heart": heart,
  "heart-pink": heartPink,
  "two-hearts": twoHearts,
  "lace-heart": laceHeart,
  "crowned-heart": crownedHeart,
  "chocolate-heart": chocolateHeart,
  "xoxo-heart": xoxoHeart,
  "love-letter": loveLetter,
  "heart-padlock": heartPadlock,
  "love-locks": loveLocks,
  "cupid": cupid,
  "bow-and-arrow": bowAndArrow,
  "fried-chicken": friedChicken,
  "taco": taco,
  "popcorn": popcorn,
  "light-bulb": lightBulb,
  "mop-bucket": mopBucket,
  "astronaut-builder": astronautBuilder,
  "doctor": doctor,
  "doctor-germs": doctorGerms,
  "grandma-cooking": grandmaCooking,
  "giraffe-car": giraffeCar,
  "capybara-duck": capybaraDuck,
  "capybara-headphones": capybaraHeadphones,
  "shark-float": sharkFloat,
  "dragon-gamer": dragonGamer,
};
