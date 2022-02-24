"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingResolvers = void 0;
const mongodb_1 = require("mongodb");
const api_1 = require("../../../lib/api");
const utils_1 = require("../../../lib/utils");
const resoleBookingsIndex = (bookingsIndex, checkInDate, checkOutDate) => {
    let dateCursor = new Date(checkInDate);
    let checkOut = new Date(checkOutDate);
    const newBookingdIndex = Object.assign({}, bookingsIndex);
    while (dateCursor <= checkOut) {
        const y = dateCursor.getUTCFullYear();
        const m = dateCursor.getUTCMonth();
        const d = dateCursor.getUTCDay();
        if (!newBookingdIndex[y]) {
            newBookingdIndex[y] = {};
        }
        if (!newBookingdIndex[y][m]) {
            newBookingdIndex[y][m] = {};
        }
        if (!newBookingdIndex[y][m][d]) {
            newBookingdIndex[y][m][d] = true;
        }
        else {
            throw new Error("selected dates can't overlap dates that have already been booked");
        }
        dateCursor = new Date(dateCursor.getTime() + 86400000);
    }
    return newBookingdIndex;
};
exports.bookingResolvers = {
    Mutation: {
        createBooking: (_root, { input }, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { id, source, checkIn, checkOut } = input;
                // Verify a logged in user is making the request
                let viewer = yield (0, utils_1.authorize)(db, req);
                if (!viewer) {
                    throw new Error("viewer cannot be found");
                }
                // find listing document that is being booked
                const listing = yield db.listings.findOne({
                    _id: new mongodb_1.ObjectId(id)
                });
                if (!listing) {
                    throw new Error("listings cannot be found");
                }
                // check that viewer is not booking their own listing
                if (listing.host == viewer._id) {
                    throw new Error("viewer can't book own listing");
                }
                // check that checkOut is not before checkIn
                const checkInDate = new Date(checkIn);
                const checkOutDate = new Date(checkOut);
                if (checkOutDate < checkInDate) {
                    throw new Error("check out date can't be before check in date");
                }
                // create a new bookingsIndex for listing being booked
                const bookingsIndex = resoleBookingsIndex(listing.bookingsIndex, checkOut, checkIn);
                // get total price to charge
                const totalPrice = listing.price * ((checkOutDate.getTime() - checkInDate.getTime()) / 86400000 + 1);
                // get user document of host of listing
                const host = yield db.users.findOne({
                    _id: listing.host
                });
                if (!host || !host.walletId) {
                    throw new Error("the host can't be found or is not connected with Stripe");
                }
                // Create Stripe charge on behalf os host
                yield api_1.Stripe.charge(totalPrice, source, host.walletId);
                // insert a new booking document to bookings collection
                const insertRes = yield db.bookings.insertOne({
                    _id: new mongodb_1.ObjectId(),
                    listing: listing._id,
                    tenant: viewer._id,
                    checkIn,
                    checkOut
                });
                const insertedBooking = insertRes.ops[0];
                // update user document of host to increment income
                yield db.users.updateOne({
                    _id: host._id
                }, {
                    $inc: { income: totalPrice }
                });
                // update bookings field of tenant
                yield db.users.updateOne({
                    _id: viewer._id
                }, {
                    $push: { bookings: insertedBooking._id }
                });
                // update  bookings field of listing document
                yield db.listings.updateOne({
                    _id: listing._id
                }, {
                    $set: { bookingsIndex },
                    $push: { bookings: insertedBooking._id }
                });
                // return newly inserted booking
                return insertedBooking;
            }
            catch (error) {
                throw new Error(`failed to create new booking: ${error}`);
            }
        })
    },
    Booking: {
        id: (booking) => {
            return booking._id.toString();
        },
        listing: (booking, _args, { db }) => {
            return db.listings.findOne({ _id: booking.listing });
        },
        tenant: (booking, _args, { db }) => {
            return db.users.findOne({ _id: booking.tenant });
        }
    }
};
