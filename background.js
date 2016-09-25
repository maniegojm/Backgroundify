var Backgroundify = window.Backgroundify || {};
var Sources = {};
var Wallhaven = {};
Backgroundify.config = {
  save_settings: function(settings, callback) {
    chrome.storage.local.set(settings, callback);
  },
  defaults: {
    wallpaper_settings: {
      blur: 5,
      opacity: "0.4",
      display: "block"
    }
  }
}
Backgroundify.config.wallpaper_settings = Backgroundify.config.defaults.wallpaper_settings

chrome.runtime.onMessage.addListener(function(request, sender, response) {
  var params = {}
  $.extend(params, request.params)

  actions[request.action].call(this, request.params, response);
  return true;
});

var actions = {
  get_wallpaper: function(params, response) {
    console.log('Getting wallpaper...');
    response({
      wallpaper: Backgroundify.wallpaper_collection.get_one(),
      settings: Backgroundify.config.wallpaper_settings
    });
  },
  save_settings: function(params, response) {
    console.log('Saving settings...');
    Backgroundify.config.save_settings({settings: params}, function() {
      console.log('Saving settings... done.');
      Backgroundify.wallpaper_collection.source.save_settings(params.source_settings);
      Backgroundify.wallpaper_collection.fetch(response);
    });
  },
  get_settings: function(params, response) {
    response({
      settings: {
        source_settings: Backgroundify.wallpaper_collection.source.get_settings()
      }
    })
  },
  get_wallpaper_settings: function(params, response) {
    response({
      settings: {
        wallpaper_settings: Backgroundify.config.wallpaper_settings
      }
    })
  }
}

Backgroundify.WallpaperCollection = function() {
  var _this = this;
  _this.source = Sources.Wallhaven;
  _this.list   = [];

  _this.fetch = function(callback) {
    _this.source.fetch({
      success: function(wallpapers) {
        _this.list = wallpapers;
        callback && callback();
      }
    });
  }

  var _generate_random_int = function() {
    var min = 0, max = _this.list.length;
    return Math.floor(Math.random() * (max - min)) + min;
  }

  _this.get_one = function() {
    return _this.list[_generate_random_int()]
  }
}

Wallhaven.wallpaper = function(id) {
  var _this = this;
  var IMG_PREFIX = "http://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-";
  var IMG_EXT    = ".jpg";

  _this.url = '';
  _this.id  = id;

  var _init = function() {
    _this.url = IMG_PREFIX + _this.id + IMG_EXT;
  }

  _init();
  return this;
}

Wallhaven.parameter = function(key, values) {
  var _this = this;
  _this.values = values;
  _this.key    = key

  _this.to_param = function() {
    var value;
    var return_obj = {};
    return_obj[_this.key] = '';
    for (var key in _this.values) {
      value = _this.values[key];
      return_obj[_this.key] += value;
    }
    return return_obj
  }
}

Wallhaven.source = function() {
  var _this = this;
  _this.model = Wallhaven.wallpaper;

  var HOME_URL = "https://alpha.wallhaven.cc";
  var PATHS = [
    "/search",
    "/random"
  ]
  var DEFAULTS = {
    url: 0
  }
  var PATTERNS = {
    url: /\.cc\/wallpaper\/([0-9]*)/
  }
  _this.url_code = DEFAULTS.url;
  _this.q = 'kitten';
  _this.categories = new Wallhaven.parameter('categories', {
    general: "1",
    anime: "0",
    people: "0"
  })
  _this.purity = new Wallhaven.parameter('purity', {
    sfw: "1",
    sketchy: "1",
    nsfw: "0"
  })

  var _init = function() {
    _this.url = HOME_URL + PATHS[_this.url_code];
  }

  _this.get_settings = function() {
    return {
      url: _this.url_code,
      q: _this.q,
      categories: _this.categories.values,
      purity: _this.purity.values
    }
  }

  _this.save_settings = function(settings) {
    _this.url_code = settings.url;
    _this.url = HOME_URL + PATHS[_this.url_code];
    _this.q = settings.q;
    _this.categories = new Wallhaven.parameter('categories', settings.categories)
    _this.purity = new Wallhaven.parameter('purity', settings.purity)
  }

  _this.fetch = function(options) {
    var _parse_data = function(data) {
      var wallpaper_id, wallpaper;
      var wallpapers = [];
      var _get_wallpaper_id = function(url) {
        return url.match(PATTERNS.url)[1]
      }

      $(data).find('.preview').map(function() {
        wallpaper_id = _get_wallpaper_id(this.href);
        wallpaper    = new _this.model(wallpaper_id);
        wallpapers.push(wallpaper);
      })

      return {
        wallpapers: wallpapers
      }
    }

    $.ajax({
      url: _this.url,
      data: $.extend({q: _this.q}, _this.categories.to_param(), _this.purity.to_param()),
      type: "GET",
      success: function(response) {
        console.log("FETCH SUCCESS YAY!");
        var parsed_data = _parse_data(response)
        options.success && options.success(parsed_data.wallpapers);
      },
      complete: function() {
        console.log("FETCH COMPLETE YAY!");
      }
    })
  }

  _init();
  return _this;
};

Sources.Wallhaven = new Wallhaven.source;
Backgroundify.wallpaper_collection = new Backgroundify.WallpaperCollection();
Backgroundify.wallpaper_collection.fetch()