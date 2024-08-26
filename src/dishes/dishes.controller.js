const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

//////////////////////////////////////////////////////////////////////////////
// Validations

function bodyHas(properyName) {
  return function (req, res, next) {

    // Check res.locals.requestBody already set or not (it can be set by isDishIdMatching or previous bodyHas calls)
    if(typeof res.locals.requestBody === 'undefined') {
      const { data = {} } = req.body;
      res.locals.requestBody = data; // Storing request body in res.locals for other middlewares and handler functions to use
    }

    if (res.locals.requestBody[properyName]) {
      return next();
    }
    next({ 
      status: 400, 
      message: `Dish must include a ${properyName}`
    });
  };
}

function validateDishPrice(req, res, next) {

  if(typeof res.locals.requestBody.price !== 'number' || Number(res.locals.requestBody.price) < 1) {
    next({
      status: 400,
      message: `Dish must have a price that is an integer greater than 0`
    });
  }
  return next();
}

function dishExists(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }
  next({
    status: 404,
    message: `Dish does not exist: ${dishId}`,
  });
}

function isDishIdMatching(req, res, next) {
  const { data = {} } = req.body;

  // Storing request body in res.locals for other middlewares and handler functions to use
  res.locals.requestBody = data;
  
  // Nothing to validate if ID is not provided
  if(!data.id) {
    return next();
  }

  // If ID is provided, it must match the ID of the dish (passed within the URL)
  if(data.id === res.locals.dish.id) {
    return next();
  }
  next({
    status: 400,
    message: `Dish id does not match route id. Dish: ${data.id}, Route: ${req.originalUrl}`,
  });
}

//////////////////////////////////////////////////////////////////////////////
// HTTP Requests (API)

// GET: "/dishes"
function list(req, res) {
  res.json({ data : dishes });
}

// POST: "/dishes"
function create(req, res) {

  // Using res.locals.requestBody to access request body data
  const { name, description, image_url, price } = res.locals.requestBody;

  const newDish = {
    id: nextId(), // Using UTILS to generate ID
    name,
    description,
    image_url,
    price
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

// GET: "/dishes/:dishId"
function read(req, res) {
  res.json({ data: res.locals.dish });
}

// PUT: "/dishes/:dishId"
function update(req, res) {

  // Using res.locals.requestBody to access request body data
  const { name, description, image_url, price } = res.locals.requestBody;
  const foundDish = res.locals.dish;

  // Updated the existing dish ("id" is excluded to prevent it from being overriden).
  foundDish.name = name;
  foundDish.description = description;
  foundDish.image_url = image_url;
  foundDish.price = price;

  res.json({ data: foundDish });
}

//////////////////////////////////////////////////////////////////////////////
// Exports

module.exports = {
  create: [
    bodyHas("name"),
    bodyHas("description"),
    bodyHas("image_url"),
    bodyHas("price"),
    validateDishPrice,
    create
  ],
  list,
  read: [dishExists, read],
  update: [
    dishExists,
    isDishIdMatching,
    bodyHas("name"),
    bodyHas("description"),
    bodyHas("image_url"),
    bodyHas("price"),
    validateDishPrice,
    update
  ]
};