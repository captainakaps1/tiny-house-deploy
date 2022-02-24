"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const lodash_merge_1 = __importDefault(require("lodash.merge"));
const User_1 = require("./User");
const Viewer_1 = require("./Viewer");
const Listings_1 = require("./Listings");
const Bookings_1 = require("./Bookings");
exports.resolvers = (0, lodash_merge_1.default)(User_1.userResolvers, Viewer_1.viewerResolvers, Listings_1.listingResolvers, Bookings_1.bookingResolvers);
