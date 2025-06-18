exports.auth = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    req.flash("error", "Please log in to view that resource");
    res.redirect("/login");
};

exports.guest = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        return next();
    }
    res.redirect("/dashboard");
};

exports.admin = (req, res, next) => {
    if (req.session.isAuthenticated && req.session.user.role === "super_admin") {
        return next();
    }
    req.flash("error", "You are not authorized to view that resource");
    res.redirect("/dashboard");
};


