const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
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
      message: `Dish must include a ${properyName}`
    });
  };
}

function validateDishPrice(req, res, next) {
  const { data = {} = {} } = req.body;
  
  if(typeof data.price !== 'number' || Number(data.price) < 1) {
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
  const { data = {} = {} } = req.body;
  
  // Nothing to validate if ID is not provided
  if(!data.id) {
    return next();
  }

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
  const { data: { name, description, image_url, price } = {} } = req.body;

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
  const foundDish = res.locals.dish;
  const { data: { name, description, image_url, price } = {} } = req.body;

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