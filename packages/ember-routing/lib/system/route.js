var get = Ember.get, set = Ember.set,
    classify = Ember.String.classify,
    decamelize = Ember.String.decamelize;


Ember.Route = Ember.Object.extend({
  /**
    @private

    This hook is the entry point for router.js
  */
  setup: function(context) {
    var container = this.container;

    var templateName = this.templateName,
        controller = container.lookup('controller:' + templateName);

    if (!controller) {
      if (context && Ember.isArray(context)) {
        controller = Ember.ArrayController.extend({ content: context });
      } else if (context) {
        controller = Ember.ObjectController.extend({ content: context });
      } else {
        controller = Ember.Controller.extend();
      }

      container.register('controller', templateName, controller);
      controller = container.lookup('controller:' + templateName);
    }

    this.setupControllers(controller, context);
    this.renderTemplates(context);
  },

  deserialize: function(params) {
    var model = this.model(params);
    return this.currentModel = model;
  },

  serialize: function(model, params) {
    if (params.length !== 1) { return; }

    var name = params[0], object = {};
    object[name] = get(model, 'id');

    return object;
  },

  model: function(params) {
    var match, name, value;

    for (var prop in params) {
      if (match = prop.match(/^(.*)_id$/)) {
        name = match[1];
        value = params[prop];
      }
    }

    if (!name) { return; }

    var className = classify(name),
        namespace = this.router.namespace,
        modelClass = namespace[className];

    Ember.assert("You used the dynamic segment " + name + "_id in your router, but " + namespace + "." + className + " did not exist and you did not override your state's `model` hook.", modelClass);
    return modelClass.find(value);
  },

  setupControllers: function(controller, context) {
    if (controller) {
      controller.set('content', context);
    }
  },

  controllerFor: function(name) {
    return this.container.lookup('controller:' + name);
  },

  modelFor: function(name) {
    return this.container.lookup('route:' + name).currentModel;
  },

  renderTemplates: function(context) {
    this.render();
  },

  render: function(name, options) {
    if (typeof name === 'object' && !options) {
      options = name;
      name = this.templateName;
    }

    name = name || this.templateName;

    var container = this.container,
        view = container.lookup('view:' + name),
        template = container.lookup('template:' + name);

    if (!view && !template) { return; }

    options = normalizeOptions(this, name, template, options);
    view = setupView(view, container, options);

    if (name === 'application') {
      appendApplicationView(this, view);
    } else {
      appendView(this, view, options);
    }
  }
});

function normalizeOptions(route, name, template, options) {
  options = options || {};
  options.into = options.into || 'application';
  options.outlet = options.outlet || 'main';
  options.name = name;
  options.template = template;

  var controller = options.controller || route.templateName;

  if (typeof controller === 'string') {
    controller = route.container.lookup('controller:' + controller);
  }

  options.controller = controller;

  return options;
}

function setupView(view, container, options) {
  var containerView;

  // Trying to set a template on a container view won't work,
  // so instead create a new default view with the template
  // and set it as the container view's `currentView`
  if (view instanceof Ember.ContainerView && options.template) {
    containerView = view;
    view = null;
  }

  view = view || container.lookup('view:default');

  set(view, 'template', options.template);
  set(view, 'viewName', options.name);

  if (containerView) {
    set(containerView, 'currentView', view);
    view = containerView;
  }

  set(view, 'controller', options.controller);

  return view;
}

function appendApplicationView(route, view) {
  var rootElement = get(route, 'router.namespace.rootElement');
  route.router._connectActiveView('application', view);
  view.appendTo(rootElement);
}

function appendView(route, view, options) {
  var parentView = route.router._lookupActiveView(options.into);
  parentView.connectOutlet(options.outlet, view);
}