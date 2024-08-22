const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

//////////////////////////////////////////////////////////////////////////////
// Validations

function bodyHas(properyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;

    if (data[properyName]) {
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
  const { data = { } = {} } = req.body;

  // Ensure dishes is an Array and it is not EMPTY
  if(!Array.isArray(data.dishes) || data.dishes.length === 0) {
    return next({
      status: 400,
      message: `Order must include at least one dish`
    });
  }

  // Validate the quantity specified within all of the dishes is valid
  data.dishes.forEach((dish, index) => {
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
  const { data = {} = {} } = req.body;

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
  const { data = {} } = req.body;

  if(!data.status || data.status === "" || !validStatus.includes(data.status)) {
    next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`
    });
  }

  // Check for DELIVERY status in specific as this is VALID but cannot be UPDATED.
  if (data.status === "delivered") {
    next({
      status: 400,
      message: `A delivered order cannot be changed`
    });
  }
  return next();
}

function isPendingStatus(req, res, next) {
  const order = res.locals.order;

  if(order.status === "pending") {
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
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

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
  const foundOrder = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  // Updated the existing order ("id" is excluded to prevent it from being overriden).
  foundOrder.deliverTo = deliverTo;
  foundOrder.mobileNumber = mobileNumber;
  foundOrder.status = status;
  foundOrder.dishes = dishes;

  res.json({ data: foundOrder });
}

// DELETE: "/orders/:orderId"
function destroy(req, res, next) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  
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
