const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /dishes handlers needed to make the tests pass
/***** Middleware functions *****/
const dishExists = (req, res, next) => {
    const { dishId } = req.params;
    const foundDish = dishes.find((dish) => dish.id === dishId);
    if (foundDish) {
        res.locals.dish = foundDish;
        return next();
    }
    next({
        status: 404,
        message: `Dish id not found: ${dishId}`
    });
}

const dishPriceHasPositiveNumber = (req, res, next) => {
    const { data: { price } = {} } = req.body;
    // console.log(`price: ${price}; price > 0: ${price > 0} typeof price: ${typeof price}`);
    if (typeof price === "number" && price > 0) {
        return next();
    }
    next({
        status: 400,
        message: `Dish must have a positive price: ${price}`
    })
}

const dishHasProperty = (propertyName) => {
    return (req, res, next) => {
        const {data = {}} = req.body;
        if (data[propertyName]) {
            res.locals.newDish = data;
            return next();
        }
        next({
            status: 400,
            message: `Must include a ${propertyName} property`
        });
    }
}

/***** Route Handlers *****/
const list = (req, res) => {
    res.status(200).json({data: dishes});
}

const read = (req, res) => {
    res.json({data: res.locals.dish});
}

const create = (req, res) => {
    const { newDish } = res.locals;
    const newDishEntry = {
        id: nextId(),
        ...newDish
    }
    dishes.push(newDishEntry);
    res.status(201).json({data: newDishEntry});
}

const update = (req, res, next) => {
    const { dish, newDish } = res.locals;
    const { dishId } = req.params;
    // console.log(`Updating dish : ${dish.name} ID: ${dish.id} req.params.dishId: ${dishId} newDish: ${JSON.stringify(newDish)} !newDish.id && newDish.id !== req.params.dishId ${!newDish.id && newDish.id !== req.params.dishId}`);
    // The id property isn't required in the body of the request,
    // but if it is present, it must match :dishId from the route.
    if (newDish.id && newDish.id !== dishId){
        return next({
            status: 400,
            message: `Dish id does not match route id. Dish: ${newDish.id}, Route: ${dishId}`,
        })
    }
    dish.name = newDish.name;
    dish.description = newDish.description;
    dish.price = newDish.price;
    dish.image_url = newDish.image_url;

    res.json({ data: dish });
}

module.exports = {
    list,
    read: [
        dishExists,
        read
    ],
    create: [
        dishPriceHasPositiveNumber,
        dishHasProperty("name"),
        dishHasProperty("price"),
        dishHasProperty("description"),
        dishHasProperty("image_url"),
        create
    ],
    update: [
        dishExists,
        dishPriceHasPositiveNumber,
        dishHasProperty("name"),
        dishHasProperty("price"),
        dishHasProperty("description"),
        dishHasProperty("image_url"),
        update
    ],
    dishExists
};