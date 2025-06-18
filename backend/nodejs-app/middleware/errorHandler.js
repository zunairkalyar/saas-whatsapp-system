exports.notFound = (req, res, next) => {
    res.status(404).render("pages/404", {
        title: "Page Not Found",
        layout: "layouts/main"
    });
};

exports.errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render("pages/500", {
        title: "Server Error",
        layout: "layouts/main",
        error: err
    });
};


