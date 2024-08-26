const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

//////////////////////////////////////////////////////////////////////////////
// Validations

function bodyHas(properyName) {
  return function (req, res, next) {

    // Check res.locals.requestBody already set or not (it can be set by isOrderIdMatching or previous bodyHas calls)
    if(typeof res.locals.requestBody === 'undefined') {
      const { data = {} } = req.body;
      res.locals.requestBody = data; // Storing request body in res.locals for other middlewares and handler functions to use
    }

    if (res.locals.requestBody[properyName]) {
      return next();
    }
    next({ 
      status: 400, 
      message: `Order must include a ${properyName}`
    });
  };
}

function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);

  if(foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order id not found: ${orderId}`
  });
}

function validateDishes(req, res, next) {

  // Ensure dishes is an Array and it is not EMPTY
  if(!Array.isArray(res.locals.requestBody.dishes) || res.locals.requestBody.dishes.length === 0) {
    return next({
      status: 400,
      message: `Order must include at least one dish`
    });
  }

  // Validate the quantity specified within all of the dishes is valid
  res.locals.requestBody.dishes.forEach((dish, index) => {
    if(!dish.quantity || typeof dish.quantity !== 'number' || Number(dish.quantity) < 1) {
      return next({
        status: 400,
        message: `dish ${index} must have a quantity that is an integer greater than 0`
      });
    }
  });
  return next();
}

function isOrderIdMatching(req, res, next) {
  const { data = {} } = req.body;

  // Storing request body in res.locals for other middlewares and handler functions to use
  res.locals.requestBody = data;

  // Nothing to validate if ID is not provided
  if(!data.id) {
    return next();
  }

  // If ID is provided, it must match the ID of the order (passed within the URL)
  if(data.id === res.locals.order.id) {
    return next();
  }
  next({
    status: 400,
    message: `Dish id does not match route id. Dish: ${data.id}, Route: ${res.locals.order.id}`,
  });
}

// These are the only valid statuses
const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];

function validateOrderStatus(req, res, next) {

  // Check status match any of the valid statuses, otherwise return error
  if(!res.locals.requestBody.status || res.locals.requestBody.status === "" || !validStatus.includes(res.locals.requestBody.status)) {
    next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`
    });
  }

  // Check for "delivered" status orders (they are valid but cannot be updated)
  if (res.locals.requestBody.status === "delivered") {
    next({
      status: 400,
      message: `A delivered order cannot be changed`
    });
  }
  return next();
}

function isPendingStatus(req, res, next) {

  // Ensure only 'pending' status orders can be deleted
  if(res.locals.order.status === "pending") {
    return next();
  }
  next({
    status: 400,
    message: `An order cannot be deleted unless it is pending`
  });
}

//////////////////////////////////////////////////////////////////////////////
// HTTP Requests

// GET: "/orders"
function list(req, res, next) {
  res.json({ data : orders });
}

// POST: "/orders"
function create(req, res) {

  // Using res.locals.requestBody to access request body data
  const { deliverTo, mobileNumber, status, dishes } = res.locals.requestBody;

  const newOrder = {
    id: nextId(), // Using UTILS to generate ID
    deliverTo,
    mobileNumber,
    status,
    dishes
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

// GET: "/orders/:orderId"
function read(req, res, next) {
  res.json({ data : res.locals.order });
}

// PUT: "/orders/:orderId"
function update(req, res) {

  // Using res.locals.requestBody to access request body data
  const { deliverTo, mobileNumber, status, dishes } = res.locals.requestBody;
  const foundOrder = res.locals.order;

  // Updated the existing order ("id" is excluded to prevent it from being overriden).
  foundOrder.deliverTo = deliverTo;
  foundOrder.mobileNumber = mobileNumber;
  foundOrder.status = status;
  foundOrder.dishes = dishes;

  res.json({ data: foundOrder });
}

// DELETE: "/orders/:orderId"
function destroy(req, res, next) {

  // Using res.locals.order to access the order's information (id)
  const index = orders.findIndex((order) => order.id === res.locals.order.id);
  
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

//////////////////////////////////////////////////////////////////////////////
// Exports

module.exports = {
  list,
  create: [
    bodyHas("deliverTo"),
    bodyHas("mobileNumber"),
    bodyHas("dishes"),
    validateDishes,
    create
  ],
  update:[
    orderExists,
    isOrderIdMatching,
    validateOrderStatus,
    bodyHas("deliverTo"),
    bodyHas("mobileNumber"),
    bodyHas("dishes"),
    validateDishes,
    update
  ],
  read: [
    orderExists,
    read
  ],
  delete : [
    orderExists,
    isPendingStatus,
    destroy
  ]
};
