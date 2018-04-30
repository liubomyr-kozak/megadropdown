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
    this.model = model;

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

        if (parent.parent) {
            setValueToParentLinkNodes(parent.parent, value);
        }
    }

    function setValueToChildLinkNodes(nodes, value) {
        nodes.forEach(function (childNode) {
            childNode.isSelected = value;

            if (childNode.child) {
                childNode.isSelectedAll = value;
                childNode.isCollapsed = false;
                setValueToChildLinkNodes(childNode.child, value);
            }

            if (childNode.parent) {
                setValueToParentLinkNodes(childNode.parent, value);
            }
        });
    }

    this.updateNode = function (node, action, value) {

        if (action == 'isSelectedAll') {
            node.isSelectedAll = value;
            node.isSelected = value;
            node.isCollapsed = false;

            setValueToChildLinkNodes(node.child, value);
        }
        if (action == 'isCollapsed') {
            node.isCollapsed = value;
        }
        if (action == 'isSelected') {
            node.isSelected = value;

            if (node.parent) {
                setValueToParentLinkNodes(node.parent, value);
            }
        }

        $.publish('updatedModel', this.model);
    }
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
            var filter = A.data('filter-type');
            data = {
                id: A.data('id'),
                text: A.text(),
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

        //  $(el).data('form-group-output-id'));  =  name will use for find output container
        // data-form-group-output="formfield-coverages"
        !Model[groupName].outputId && (Model[groupName].outputId = $(el).data('form-group-output-id'));

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


    function init(model, group) {
        _this.model.modelIteration(model, group, function iteration(node, groupName) {
            node.child && node.child.forEach(iteration);

            if (node.hasOwnProperty('isCollapsed') && !node.selector) {
                var selector = new Selector();
                node.list.initSelector(selector.$el);
                node.selector = selector;

                node.selector.$el.click(function (e) {
                    e.stopPropagation();
                    model.updateNode(node, 'isSelectedAll', !node.isSelectedAll);
                });
            }

            node.link.$el.click(function (e) {
                if (node.child) {
                    model.updateNode(node, 'isCollapsed', !node.isCollapsed);
                } else {
                    model.updateNode(node, 'isSelected', !node.isSelected);
                }
            })
        })
    }

    this.render = function () {
        _this.model.modelIteration(this.model, this.group, function iteration(node, groupName) {

            node.child && node.child.forEach(iteration);
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


    function getTemplate(id, name) {
        return `<li data-percent="${name}" data-value="" data-string="${name}" data-id-output="${id}">
            <span>${name}</span>
            <input class="field-input" type="text"> % <i class="icon-remove"></i>
         </li>`;
    }


    var newSelectedModel = {};
    var oldSelectedModel = {};


    $('[data-form-group-output]').hide();
    $.subscribe('updatedModel', function (ev, modelData) {
        newSelectedModel = {};

        model.modelIteration(model, groups, function iteration(node, groupName) {
            node.child && node.child.forEach(function (subNode) {
                iteration(subNode, groupName)
            });

            if (node.child) {
                return;
            }

            if (!newSelectedModel[groupName]) {
                newSelectedModel[groupName] = {
                    allOutputData: [],
                    outputDataFiltered: []
                };

                newSelectedModel[groupName].limit = model.model[groupName].limit;
                newSelectedModel[groupName].outputId = model.model[groupName].outputId;
            }

            if (node.isSelected) {
                newSelectedModel[groupName].allOutputData.push({
                    id: node.parent.id,
                    text: node.parent.text
                });

                if (node.filterType) {
                    if (node.filterType == 'useParent') {

                        if (!newSelectedModel[groupName].outputDataFiltered.find(function (selectorNode) {
                            return selectorNode.id == node.parent.id;
                        })) {
                            newSelectedModel[groupName].outputDataFiltered.push({
                                id: node.parent.id,
                                text: node.parent.text,
                            });
                        }

                    } else if (node.filterType == 'skip') {
                        console.log('skip id field', node.id);
                    }
                } else {
                    if (!newSelectedModel[groupName].outputDataFiltered.find(function (selectorNode) {
                        return selectorNode.id == node.id;
                    })) {
                        newSelectedModel[groupName].outputDataFiltered.push({
                            id: node.id,
                            text: node.text
                        });
                    }
                }
            }
        });

        for (var selectedItem in newSelectedModel) {
            var outputContainer = $(`[data-form-group-output="${newSelectedModel[selectedItem].outputId}"]`);
            if(!newSelectedModel[selectedItem].outputDataFiltered.length){
                outputContainer.hide();
                continue;
            }
            outputContainer.show();
            newSelectedModel[selectedItem].outputDataFiltered.forEach(function (node) {
                if (!outputContainer.find(`li[data-id-output="${node.id}"]`).length) {
                    outputContainer.find('ul').append(getTemplate(node.id, node.text))
                }
            })
        }
    });


    $('.selector').selectpicker();

    $('#form-data-value').text(new Date().toISOString().replace(/T\d+:\d+:\d+\.\d+Z/, ''));

    $(document).on('click', '.icon-remove', function (e){
        $(this).parent('li').remove();
    });

    toastr.options.positionClass = "toast-top-center";
    toastr.success('Have fun storming the castle!')
});



