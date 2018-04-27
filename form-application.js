var $ = $ || jQuery;

(function ($) {
    var o = $({});
    $.subscribe = function () {
        o.on.apply(o, arguments);
    };
    $.unsubscribe = function () {
        o.off.apply(o, arguments);
    };
    $.publish = function () {
        o.trigger.apply(o, arguments);
    };

}(jQuery));

function stopEv(e) {
    e.stopPropagation();
    e.preventDefault();
}

function List(nodes) {
    var _this = this;

    this.hide = function () {
        $(nodes).hide()
    };

    this.show = function () {
        $(nodes).show()
    };

    this.initSelector = function initSelector(selector) {
        $(nodes).before(selector);
        this.initSelector = function () {
            console.log('selector is init', selector);
        };
    }.bind(this);
}

function Link(el) {
    var _this = this;
    this.selectedClassName = 'form-selected-link';
    this.$el = el;

    this.select = function (el) {
        _this.$el.addClass('form-selected-link');
    };

    this.deselect = function (el) {
        _this.$el.removeClass('form-selected-link');
    };
}

function Selector() {
    var _this = this;
    this.canSelectedText = '(select all)';
    this.canDeselectedText = '(deselected all)';

    this.addSelectedIndicator = function () {
        return '<span class="form-select-action"></span>';
    };

    this.changeToDeselect = function () {
        _this.$el.text(this.canDeselectedText)
    };

    this.changeToSelect = function () {
        _this.$el.text(this.canSelectedText);
    };

    this.$el = $(this.addSelectedIndicator());
    this.changeToSelect()
}

function Model(model) {
    this.model = model;
    this.updateNode = function (node, action, value) {
        node[action] = value;
        $.publish('updatedModel', this.model)
    }
}


Model.initModel = function initModel($formGroupArray) {
    var Model = {};

    function addGroupIfNotExist(Model, groupName) {
        !Model[groupName] && (Model[groupName] = []);
    }

    function getUlChild(elements) {
        var res = Array.from(elements).reduce(function (reduceRes, el) {
            var data = {};
            var findChild = $(el).find('> ul');
            var A = $(el).find('> a');

            data = {
                id: A.data('id'),
                text: A.text(),
                link: new Link(A),
                isSelected: false,
            };
            if (findChild.length) {
                data.isCollapsed = true;
                data.isSelectedAll = false;
                data.list = new List($(el).find('> ul'));
                data.child = getUlChild($(el).find('> ul > li'));
            }
            reduceRes.push(data);
            return reduceRes;
        }, []);
        return res.length ? res : [];
    }

    $formGroupArray.each(function (res, el) {
        var groupName = $(el).data('form-group');
        addGroupIfNotExist(Model, groupName);
        Model[groupName].push({}['child'] = getUlChild($(el).find('> li')));
    });
    return Model;
};


function DOM(model, group) {
    var _this = this;
    this.model = model;
    this.group = group;

    $.subscribe('updatedModel', model => _this.render(model));

    function modeIteration(model, group, callback) {
        group.forEach(function (groupName) {
            model.model[groupName].forEach(function (nodeGroup) {
                nodeGroup.forEach(callback)
            });
        });
    }

    function init(model, group) {
        modeIteration(model, group, function iteration(node) {
            node.child && node.child.forEach(iteration);
            if (node.hasOwnProperty('isCollapsed') && !node.selector) {
                var selector = new Selector();
                node.list.initSelector(selector.$el);
                node.selector = selector;

                node.selector.$el.click(function (e) {
                    e.stopPropagation();
                    model.updateNode(node, 'isSelectedAll', !node.isSelectedAll);
                });

                node.link.$el.click(function (e) {
                    if (node.child) {
                        model.updateNode(node, 'isCollapsed', !node.isCollapsed);
                    } else {
                        model.updateNode(node, 'isSelected', !node.isSelected);
                    }
                })
            }
        })
    }

    this.render = function () {
        modeIteration(this.model, this.group, function iteration(node) {
            node.child && node.child.forEach(iteration);
            if (node.hasOwnProperty('child')) {
                if (node.isCollapsed) {
                    node.list.hide();
                } else {
                    node.list.show();
                }

                if (node.isSelectedAll) {
                    node.selector.changeToDeselect();
                    node.isCollapsed = true;
                    node.list.show();
                    node.child.forEach(childNode => {
                        childNode.isSelected = true;
                        childNode.link.select();
                    })

                } else {
                    node.selector.changeToSelect();

                }

            } else {
                if (node.isSelected) {
                    node.link.select();
                } else {
                    node.link.deselect();
                }
            }

        })
    }.bind(this);

    init(this.model, group);
    this.render();
}


$(document).ready(function () {
    var model = new Model(Model.initModel($("[data-form-group]")));

    var groups = Array.from($("[data-form-group]")).reduce(function (res, group) {
        var formGroupName = $(group).data('form-group');
        (res.indexOf(formGroupName) == -1) && res.push(formGroupName);
        return res;
    }, []);
    new DOM(model, groups);
});

