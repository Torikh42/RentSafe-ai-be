import { createRouter } from "../../factory";
import {
  acceptBookingRoute,
  cancelBookingRoute,
  createBookingRoute,
  getMyBookingsRoute,
  rejectBookingRoute,
} from "./bookings.routes";
import {
  acceptBookingHandler,
  cancelBookingHandler,
  createBookingHandler,
  getMyBookingsHandler,
  rejectBookingHandler,
} from "./bookings.handlers";

const bookingsRouter = createRouter()
  .openapi(createBookingRoute, createBookingHandler)
  .openapi(getMyBookingsRoute, getMyBookingsHandler)
  .openapi(acceptBookingRoute, acceptBookingHandler)
  .openapi(rejectBookingRoute, rejectBookingHandler)
  .openapi(cancelBookingRoute, cancelBookingHandler);

export default bookingsRouter;
