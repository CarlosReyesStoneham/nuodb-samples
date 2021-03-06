/* Copyright (c) 2013 NuoDB, Inc. */

/**
 * This file contains Storefront controller logic. It's all encapsulated in the "Storefront" global namespace.
 */

var Storefront = {
    init: function(cfg) {
        var me = this;

        // Initialize elements shared across pages
        me.TemplateMgr.applyTemplate('tpl-messages', '#messages', cfg.messages);
        me.initSearchBox();
        if (window.self === window.top) {
            $('#admin-link').show();
        }        
        $('.alert .btn').click(function() {
            var buttons = $('.btn', $(this).closest('form'));
            setTimeout(function() {
                buttons.attr('disabled', 'disabled');
            }, 0);
        });
        

        // Initialize page-specific elements
        switch (cfg.pageName) {
            case "welcome":
                me.initWelcomePage(cfg.pageData);
                break;

            case "products":
                me.initProductsPage(cfg.pageData.products, cfg.pageData.categories, cfg.pageData.filter);
                break;

            case "product":
                me.initProductPage(cfg.pageData);
                break;

            case "cart":
                me.initCartPage(cfg.pageData);
                break;
        }
    },

    initSearchBox: function() {
        var me = this;
        $('.search').click(function(event) {
            var txt = $('.search-query', this);
            if ($(event.target).hasClass('search-clear')) {
                // "X" button was clicked to clear out search box
                txt.val('').trigger('change').trigger('clear');
            } else {
                txt.select();
            }
            txt.focus();
        }).change(function() {
            // Toggle "X" icon in search box based on whether there's content in the box
            var txt = $('.search-query', this);
            var ico = $('.search-icon', this);
            ico[txt.val() ? 'addClass' : 'removeClass']('search-icon-clear');
        });
    },

    initWelcomePage: function(pageData) {
        var me = this;
        
        if (!document.location.hash || document.location.hash == '#') {
            // Move messages up if we're dealing with choices
            $('#top-bar').after($('#messages').parent());
        }

        // Render DDL
        me.TemplateMgr.applyTemplate('tpl-ddl', '#ddl textarea', pageData.ddl);

        // Render workload list
        me.TemplateMgr.applyTemplate('tpl-workloads', '#workloads', pageData.workloads);

        // Handle DDL toggling
        $('#lnk-show-ddl').click(function(e) {
            e.preventDefault();
            var lnk = $(this);
            lnk.toggleClass('active');
            if (lnk.hasClass('active')) {
                $('#ddl').slideDown({
                    complete: function() {
                        $('#ddl textarea').focus();
                    }
                })
            } else {
                $('#ddl').slideUp();
            }
        });

        // Select quantity upon focus
        $('input[type=number]').on('click', function(e) {
            $(this).select();
            $(this).focus();
        });

        // Get the carousel moving
        $('.carousel').carousel({
            interval: 7000
        });
        
        // Handle reset button
        $('#btn-reset').click(function() {
            $('input[type=number]').val('0');
            $(this).closest('form').submit();
        });
        
        // Handle tooltips
        $('a[data-toggle="tooltip"]').tooltip();
        
        // Enable HTML5 form features in browsers that don't support it
        $('form').form();
    },

    initProductsPage: function(products, categories, filter) {
        var me = this;
        me.filter = filter;

        // Render category list
        me.TemplateMgr.applyTemplate('tpl-category-nav', '#category-nav', categories);

        // Render product list
        me.TemplateMgr.applyTemplate('tpl-product-list', '#product-list', products);

        // Handle infinite scrolling
        me.paginator = $('#paginator');
        $(window).scroll(function() {
            if ($(window).scrollTop() + $(window).height() >= $('#product-list').offset().top + $('#product-list').height() - 500) {
                if (!me.paginator.is(':visible') && me.paginator.hasClass('loading')) {
                    me.paginator.show();
                    me.filter.page++;
                    me.updateProductList(true);
                }
            }
        });

        // Handle sort events
        $('#product-sort').on('click', 'a', function(event) {
            event.preventDefault();
            me.filter.sort = $(this).attr('data-sort');
            $('#product-sort-label').html($(this).html());
            me.updateProductList();
        });

        // Handle category clicks
        $('#category-nav').on('click', 'a', function() {
            // Toggle selection of this category
            var category = $(this).parent().attr('data-category');
            var categories = me.filter.categories || [];
            var idx = $.inArray(category, categories);
            if (idx >= 0) {
                //categories.splice(idx, 1);
                categories = [];
            } else {
                //categories.push(category);
                categories = [category];
            }
            me.filter.categories = categories;
            me.updateProductList();
        });

        // Avoid POST for search on this page -- use AJAX instead
        $('form.search').submit(function(e) {
            $('.search').change();
            return false;
        });
        $('.search').change(function() {
            var txt = $('.search-query', this);
            if (me.filter.matchText != txt.val()) {
                me.filter.matchText = txt.val();
                me.updateProductList();
            }
        });

        // Initialize UI elements on page outside the templates
        me.syncProductsPage(products);
    },

    initProductPage: function(product) {
        var me = this;

        me.TemplateMgr.applyTemplate('tpl-product', '#product', product);

        // Handle "Add to Cart" form submit
        $('form.add-to-cart').submit(function(event) {
            event.preventDefault();
            $.ajax('api/customer/cart', {
                cache: false,
                data: {
                    productId: product.id,
                    quantity: parseInt($('[name=quantity]', this).val())
                },
                dataType: 'json',
                type: 'PUT'
            }).done(function(responseData) {
                document.location.href = "cart";
            });
        });

        // Handle "Add Review" form submit
        $('form.add-review').submit(function(event) {
            event.preventDefault();
            $.ajax('api/products/' + encodeURIComponent(product.id) + '/reviews', {
                cache: false,
                data: {
                    title: $('[name=title]', this).val(),
                    comments: $('[name=comments]', this).val(),
                    emailAddress: $('[name=emailAddress]', this).val(),
                    rating: $('[name=rating]', this).val()
                },
                dataType: 'json',
                type: 'POST'
            }).done(function(responseData) {
                document.location.reload();
            });
        });
    },

    initCartPage: function(cart) {
        var me = this;
        me.TemplateMgr.applyTemplate('tpl-cart', '#cart', cart);
    },

    syncProductsPage: function(data) {
        var me = this;

        // Reset paginator
        var hasNext = (me.filter.page < Math.floor(data.totalCount / me.filter.pageSize));
        me.paginator.hide();
        me.paginator[hasNext ? 'addClass' : 'removeClass']('loading');

        // Update search box 
        if (me.filter.matchText) {
            $('#search').val(me.filter.matchText).trigger('change');
        }

        // Update sort selection
        if (me.filter.sort) {
            var sortLabel = $('#product-sort [data-sort=' + me.filter.sort + ']').html();
            if (sortLabel) {
                $('#product-sort-label').html(sortLabel);
            }
        }

        // Update "all items" label
        $('#lbl-all-items').html(((data.totalCount != 1) ? data.totalCount.format(0) + ' products' : '1 product'));

        // Select active categories
        $('#category-nav li').removeClass('active');
        var categories = me.filter.categories;
        if (categories) {
            for ( var i = 0; i < categories.length; i++) {
                $('#category-nav li[data-category="' + categories[i] + '"]').addClass('active');
            }
        }

        delete me.updateRequest;
    },

    updateProductList: function(append) {
        var me = this;
        if (me.updateRequest) {
            if (append) {
                return;
            }
            me.updateRequest.abort();
        }
        if (!append) {
            me.filter.page = 1;
        }
        me.updateRequest = me.TemplateMgr.autoFillTemplate('product-list', 'api/products', me.filter, $.proxy(me.syncProductsPage, me), append);
    }
};
