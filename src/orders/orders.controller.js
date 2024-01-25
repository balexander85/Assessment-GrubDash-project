const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
/***** Middleware functions *****/
const orderExists = (req, res, next) => {
    const { orderId } = req.params;
    const foundOrder = orders.find((order) => order.id === orderId);
    if (foundOrder) {
        res.locals.order = foundOrder;
        return next();
    }
    next({
        status: 404,
        message: `Order id not found: ${orderId}`
    });
}

const orderHasProperty = (propertyName) => {
    return (req, res, next) => {
        const { data = {} } = req.body;
        if (data[propertyName]) {
            res.locals.newOrder = data;
            return next();
        }
        next({
            status: 400,
            message: `Must include a ${propertyName} property`
        });
    }
}

const orderHasValidStatus = (req, res, next) => {
    const { data: { status } = {} } = req.body;
    const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];

    validStatus.includes(status) ? next() : next({status: 400, message: `Order must have a status of ${validStatus.join(", ")}`})
}

const orderHasValidDishes = (req, res, next) => {
    const { data: { dishes } = [] } = req.body;
    // console.log(`typeof dishes: ${typeof dishes} Array.isArray(dishes): ${Array.isArray(dishes)}`);
    // const invalidDishQuantities = dishes.find((dish) => !dish.quantity || dish.quantity < 0);
    // console.log(`invalidDishQuantities: ${invalidDishQuantities}`);
    if (Array.isArray(dishes) && dishes.length > 0) {
        res.locals.validDishes = dishes;
        return next();
    }
    next({
        status: 400,
        message: `Order must include at least one dish`
    });
}

const dishHasValidQuantity = (req, res, next) => {
    const { validDishes } = res.locals;
    const invalidDishQuantities = validDishes
        .filter((dish) => typeof dish.quantity !== "number" || !dish.quantity || dish.quantity < 1)
        .map((dish) => dish.id);
    // console.log('invalidDishQuantities: ', invalidDishQuantities);
    if (!invalidDishQuantities.length) {
        next();
    }
    next({
        status: 400,
        message: `Dish ${invalidDishQuantities} must have a quantity that is an integer greater than 0`
    });
}

/***** Route Handlers *****/
const list = (req, res) => {
    res.json({ data: orders });
}

const read = (req, res) => {
    res.json({ data: res.locals.order });
}

const create = (req, res) => {
    const { newOrder } = res.locals;
    const newOrderEntry = {
        id: nextId(),
        status: "pending",
        ...newOrder
    }
    orders.push(newOrderEntry);
    res.status(201).json({ data: newOrderEntry });
}

const update = (req, res, next) => {
    const { order, newOrder } = res.locals;
    const { orderId } = req.params;

    if (newOrder.id && newOrder.id !== orderId) {
        return next({
            status: 400,
            message: `Order id does not match route id. Order: ${newOrder.id}, Route: ${orderId}.`
        })
    }

    order.deliverTo = newOrder.deliverTo;
    order.mobileNumber = newOrder.mobileNumber;
    order.status = newOrder.status;
    order.dishes = newOrder.dishes;

    res.json({ data: order });

}

const destroy = (req, res, next) => {
    const { orderId } = req.params;
    const { order } = res.locals;
    const index = orders.findIndex((order) => order.id === orderId);
    if (index > -1 && order.status === "pending") {
        orders.splice(index, 1);
        res.sendStatus(204);
    } else {
        next({
            status: 400,
            message: `An order cannot be deleted unless it is pending.`
        })
    }
}

module.exports = {
    list,
    read: [orderExists, read],
    create: [
        orderHasValidDishes,
        dishHasValidQuantity,
        orderHasProperty("deliverTo"),
        orderHasProperty("mobileNumber"),
        orderHasProperty("dishes"),
        create
    ],
    delete: [orderExists, destroy],
    update: [
        orderExists,
        orderHasValidStatus,
        orderHasValidDishes,
        dishHasValidQuantity,
        orderHasProperty("deliverTo"),
        orderHasProperty("mobileNumber"),
        orderHasProperty("status"),
        orderHasProperty("dishes"),
        update
    ],
    orderExists
};