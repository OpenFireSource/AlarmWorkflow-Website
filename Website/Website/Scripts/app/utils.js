(function (jQ) {

    window.utils = {};

    window.utils.scale = function scale(outer, inner) {
        if (inner.length) {
            inner.css('font-size', '1px');

            if (inner.text().length == 0) {
                return;
            }

            var width = outer.width();
            var height = outer.height();
            if (inner.height() == 0 || inner.width() == 0) {
                return;
            }
            while (inner.height() < height && inner.width() <= width) {
                inner.css('font-size', (parseInt(inner.css('font-size')) + 4) + "px");
            }
            while (inner.width() > width || inner.height() > height) {
                inner.css('font-size', (parseInt(inner.css('font-size')) - 1) + "px");
            }
        }
    };

})($);