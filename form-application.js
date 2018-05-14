var $ = $ || jQuery;

!function (n, t) {
    var o, u = n.jQuery || n.Cowboy || (n.Cowboy = {});
    u.throttle = o = function (n, o, e, i) {
        var r, a = 0;

        function c() {
            var u = this, c = +new Date - a, f = arguments;

            function d() {
                a = +new Date, e.apply(u, f)
            }

            i && !r && d(), r && clearTimeout(r), i === t && c > n ? d() : !0 !== o && (r = setTimeout(i ? function () {
                r = t
            } : d, i === t ? n - c : n))
        }

        return "boolean" != typeof o && (i = e, e = o, o = t), u.guid && (c.guid = e.guid = e.guid || u.guid++), c
    }, u.debounce = function (n, u, e) {
        return e === t ? o(n, u, !1) : o(n, e, !1 !== u)
    }
}(window);

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

(function ($) {
    function visible(element) {
        return $.expr.filters.visible(element) && !$(element).parents().addBack().filter(function () {
            return $.css(this, 'visibility') === 'hidden';
        }).length;
    }

    function focusable(element, isTabIndexNotNaN) {
        var map, mapName, img, nodeName = element.nodeName.toLowerCase();
        if ('area' === nodeName) {
            map = element.parentNode;
            mapName = map.name;
            if (!element.href || !mapName || map.nodeName.toLowerCase() !== 'map') {
                return false;
            }
            img = $('img[usemap=#' + mapName + ']')[0];
            return !!img && visible(img);
        }
        return (/input|select|textarea|button|object/.test(nodeName) ?
            !element.disabled :
            'a' === nodeName ?
                element.href || isTabIndexNotNaN :
                isTabIndexNotNaN) &&
            // the element and all of its ancestors must be visible
            visible(element);
    }

    $.extend($.expr[':'], {
        focusable: function (element) {
            return focusable(element, !isNaN($.attr(element, 'tabindex')));
        }
    });
})(jQuery);

function stopEv(e) {
    e.stopPropagation();
    e.preventDefault();
}

function List(nodes) {
    var _this = this;

    this.$listNode = nodes;
    this.hide = function () {
        this.$listNode.hide()
    };

    this.show = function () {
        this.$listNode.show()
    };

    this.initSelector = function initSelector(selector) {
        this.$listNode.before(selector);
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
    var _this = this;
    this.model = model;

    function toggleDeleteStateNode(node, value) {
        if (value == false) {
            node.value = '';
            node.isDeleted = true;
        }
        if (value == true) {
            node.isDeleted = false;
        }
    }

    function getSelectLimit(groupName) {
        return _this.model[groupName].limit
    }


    function isSelectLimitValid(action, node, value, groupName) {
        var data = _this.selectedModel[groupName];
        var limitValue = _this.model[groupName].limit;

        if (action == 'isSelectedAll') {
            if (node.child.length >= limitValue) {
                return true;
            }
            if (data) {
                if (data.outputDataFiltered.length >= limitValue) {
                    return true;
                }
                if ((data.outputDataFiltered.length + node.child.length) > limitValue) {
                    return true;
                }
            }
        }
        if (action == 'isSelected') {
            if (data && data.outputDataFiltered.length >= limitValue) {
                return true;
            }
        }
    }

    this.modelIteration = function (model, group, callback) {
        group.forEach(function (groupName) {
            model.model[groupName].nodes.forEach(function (nodeGroup) {
                nodeGroup.forEach(function (node) {
                    callback(node, groupName);
                });
            });
        });
    };

    function setValueToParentLinkNodes(parent, value) {
        var selectedChild = parent.child.filter(function (child) {
            return child.isSelected;
        });

        if (selectedChild.length > 0) {
            parent.isSelected = true;
        } else {
            parent.isSelected = value;
        }

        if (parent.child.length == selectedChild.length) {

            parent.isSelectedAll = true;

            var subChild = parent.child
                .filter(function (node) {
                    return node.child;
                });

            if (subChild.length) {
                var isSubChildSelected = subChild[0].child
                    .filter(function (child) {
                        return child.isSelected;
                    });
                parent.isSelectedAll = isSubChildSelected.length == subChild[0].child.length;
            }
        } else {
            parent.isSelectedAll = false;
        }

        toggleDeleteStateNode(parent, value);

        if (parent.parent) {
            setValueToParentLinkNodes(parent.parent, value);
        }
    }

    function setValueToChildLinkNodes(nodes, value, groupName) {
        nodes.forEach(function (childNode) {

            childNode.isSelected = value;

            toggleDeleteStateNode(childNode, value);

            if (childNode.child) {
                childNode.isSelectedAll = value;
                childNode.isCollapsed = false;
                setValueToChildLinkNodes(childNode.child, value, groupName);
            }

            if (childNode.parent) {
                setValueToParentLinkNodes(childNode.parent, value);
            }
        });
    }

    this.updateNode = function (node, action, value, groupName) {


        if (action == 'isSelectedAll') {

            if (value && isSelectLimitValid(action, node, value, groupName)) {
                alert('You are allowed up to 5 selections.');

                node.isCollapsed = false;
                $.publish('updatedModel', this.model);
                return
            }

            node.isSelectedAll = value;
            node.isSelected = value;
            node.isCollapsed = false;

            toggleDeleteStateNode(node, value);
            setValueToChildLinkNodes(node.child, value, groupName);
        }
        if (action == 'isCollapsed') {
            node.isCollapsed = value;
        }
        if (action == 'isSelected') {


            if (value && isSelectLimitValid(action, node, value, groupName)) {
                alert('You are allowed up to 5 selections.');
                return
            }

            node.isSelected = value;

            toggleDeleteStateNode(node, value);

            if (node.parent) {
                setValueToParentLinkNodes(node.parent, value);
            }
        }

        $.publish('updatedModel', this.model);
    };

    this.removeSelectedItem = function (data) {
        _this.modelIteration(_this, [data.group], function iteration(node, groupName) {
            node.child && node.child.forEach(function (subNode) {
                iteration(subNode, groupName)
            });
            if (node.id == data.id) {
                node.isSelected = false;

                toggleDeleteStateNode(node, false);

                if (node.parent) {
                    setValueToParentLinkNodes(node.parent, false);
                }
                if (node.child) {
                    setValueToChildLinkNodes(node.child, false, groupName);
                }
            }
        });
        $.publish('updatedModel', this.model);
    };

    this.setInputValue = function (data) {
        _this.modelIteration(_this, [data.group], function iteration(node, groupName) {
            node.child && node.child.forEach(function (subNode) {
                iteration(subNode, groupName)
            });

            if (node.id == data.id) {
                node.value = data.value;
                node.isDeleted = false;
            }
        });
        $.publish('updatedModel', this.model);
    };

    this.itemIsDeleted = function (data) {
        _this.modelIteration(_this, [data.group], function iteration(node, groupName) {
            node.child && node.child.forEach(function (subNode) {
                iteration(subNode, groupName)
            });
            if (node.id == data.id) {
                node.isDeleted = false;
            }
        });
    };


    this.setOtherValue = function (data) {
        _this.modelIteration(_this, [data.group], function iteration(node, groupName) {
            node.child && node.child.forEach(function (subNode) {
                iteration(subNode, groupName)
            });

            if (node.id == data.id) {

                if (isSelectLimitValid('isSelected', node, true, groupName)) {
                    alert('You are allowed up to 5 selections.');
                    return;
                }

                node.title = data.title;
                node.isSelected = true;
            }
        });
        $.publish('updatedModel', this.model);
    };


    this.selectedModel = {};
    this.deletedModel = {};
}

Model.initModel = function initModel($formGroupArray) {
    var Model = {};

    function addGroupIfNotExist(Model, groupName) {
        if (!Model[groupName]) {
            Model[groupName] = {
                nodes: [],
                outputId: '',
                limit: ''
            }
        }
    }

    function getUlChild(elements, parent) {
        var res = Array.from(elements).reduce(function (reduceRes, el) {
            var data = {};
            var findChild = $(el).find('> ul');
            var A = $(el).find('> a');
            var filter = A.data('output-filter-type');

            data = {
                id: A.data('id'),
                title: A.text(),
                link: new Link(A),
                isSelected: false,
            };

            if (parent) {
                data.parent = parent;
            }

            if (filter) {
                data.filterType = filter;
            }

            if (findChild.length) {
                data.isCollapsed = true;
                data.isSelectedAll = false;
                data.list = new List($(el).find('> ul'));
                data.child = getUlChild($(el).find('> ul > li'), data);
            }
            reduceRes.push(data);
            return reduceRes;
        }, []);
        return res.length ? res : [];
    }

    $formGroupArray.each(function (res, el) {
        var groupName = $(el).data('form-group');
        addGroupIfNotExist(Model, groupName);

        Model[groupName].nodes.push({}['child'] = getUlChild($(el).find('> li')));

        //  $(el).data('form-group'));  =  name will use for find output container
        // data-form-group-output="formfield-coverages"
        !Model[groupName].outputId && (Model[groupName].outputId = $(el).data('form-group'));

        // if limit set, user will get a message
        // todo add custom message template
        !Model[groupName].limit && (Model[groupName].limit = $(el).data('form-group-limit'));
    });

    return Model;
};

function DOM(model, group) {
    var _this = this;
    this.model = model;
    this.group = group;

    $.subscribe('updatedModel', function (model) {
        _this.render(model);
    });

    console.log(this.model);

    function init(model, group) {
        _this.model.modelIteration(model, group, function iteration(node, groupName) {
            node.child && node.child.forEach(function (subNode) {
                iteration(subNode, groupName)
            });

            if (node.hasOwnProperty('isCollapsed') && !node.selector) {
                var selector = new Selector();
                node.list.initSelector(selector.$el);
                node.selector = selector;

                node.selector.$el.click(function (e) {
                    e.stopPropagation();
                    model.updateNode(node, 'isSelectedAll', !node.isSelectedAll, groupName);
                });
            }

            node.link.$el.click(function (e) {
                if (node.child) {
                    model.updateNode(node, 'isCollapsed', !node.isCollapsed, groupName);
                } else {
                    model.updateNode(node, 'isSelected', !node.isSelected, groupName);
                }
            })
        })
    }

    this.render = function () {
        _this.model.modelIteration(this.model, this.group, function iteration(node, groupName) {

            node.child && node.child.forEach(function (subNode) {
                iteration(subNode, groupName);
            });
            if (node.hasOwnProperty('child')) {
                node.isCollapsed ? node.list.hide() : node.list.show();
                node.isSelectedAll ? node.selector.changeToDeselect() : node.selector.changeToSelect();
            }
            node.isSelected ? node.link.select() : node.link.deselect();
        })
    }.bind(this);

    init(this.model, group);
    this.render();
}

function getTemplate(id, name, value, presentIsExist) {
    return `<li data-id-output="${id}">
                    <span>${name}</span>
                    <input class="field-input" type="text" value="${value ? value : ''}"> ${presentIsExist ? '%' : '' } <i class="js-remove-item icon-remove"></i>
                </li>`;
}

function getValue(value) {
    return value ? value : '';
}

function setSelectorToInvalid($el) {
    return $el.siblings('.dropdown-toggle')
        .addClass('not-valid');
}

$(document).ready(function () {
    var model = new Model(Model.initModel($("[data-form-group]")));
    var groups = Array.from($("[data-form-group]")).reduce(function (res, group) {
        var formGroupName = $(group).data('form-group');
        if (res.indexOf(formGroupName) == -1) {
            res.push(formGroupName);
        }
        return res;
    }, []);

    new DOM(model, groups);
});