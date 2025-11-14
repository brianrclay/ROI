$(document).ready(function() {
    var isInitialLoad = true;
    
    // Handle Share button click
    $('.share-button').on('click', function() {
        // Copy current URL to clipboard
        var url = window.location.href;
        
        // Use the Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                showTooltip();
            }).catch(function(err) {
                console.error('Failed to copy URL:', err);
                // Fallback for older browsers
                fallbackCopyToClipboard(url);
            });
        } else {
            // Fallback for older browsers
            fallbackCopyToClipboard(url);
        }
    });
    
    function fallbackCopyToClipboard(text) {
        var textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showTooltip();
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }
    
    function showTooltip() {
        var tooltip = $('#share-tooltip');
        
        // First set display to block, then trigger reflow for animation
        tooltip.css('display', 'block');
        
        // Use requestAnimationFrame to ensure the browser applies the initial state before animation
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                tooltip.addClass('show');
            });
        });
        
        // Hide tooltip after 2 seconds
        setTimeout(function() {
            tooltip.removeClass('show');
            // Remove display after transition completes
            setTimeout(function() {
                tooltip.css('display', 'none');
            }, 200);
        }, 2000);
    }
    
    // URL parameter management
    function updateURLParams() {
        // Skip URL updates during initial load
        if (isInitialLoad) return;
        var params = new URLSearchParams();
        
        // Get current values
        var monthlyBandwidth = $('#monthly-bandwidth').val();
        var monthlyBandwidthUnit = $('#bandwidth-unit-dropdown .dropdown-value').text();
        var currentCacheHit = $('#current-cache-hit').val().replace('%', '');
        var fastlyCacheHit = $('#fastly-cache-hit').val().replace('%', '');
        var originEgressCost = $('#origin-egress-cost').val().replace('$', '');
        var toggleState = $('.origin-shielding-wrapper').hasClass('toggle-on') ? 'on' : 'off';
        
        // Add to params
        if (monthlyBandwidth) params.set('bandwidth', monthlyBandwidth);
        if (monthlyBandwidthUnit) params.set('bandwidthUnit', monthlyBandwidthUnit);
        if (currentCacheHit) params.set('currentCacheHit', currentCacheHit);
        if (fastlyCacheHit) params.set('fastlyCacheHit', fastlyCacheHit);
        if (originEgressCost) params.set('originEgressCost', originEgressCost);
        if (toggleState) params.set('toggle', toggleState);
        
        // Update URL without page reload
        var newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newURL);
    }
    
    function loadFromURLParams() {
        var params = new URLSearchParams(window.location.search);
        
        // Load monthly bandwidth
        if (params.has('bandwidth')) {
            $('#monthly-bandwidth').val(params.get('bandwidth'));
        }
        
        // Load bandwidth unit
        if (params.has('bandwidthUnit')) {
            var unit = params.get('bandwidthUnit');
            if (unit === 'GB' || unit === 'TB') {
                $('#bandwidth-unit-dropdown .dropdown-value').text(unit);
            }
        }
        
        // Load current cache hit
        if (params.has('currentCacheHit')) {
            var value = params.get('currentCacheHit');
            $('#current-cache-hit').val(value + '%');
        }
        
        // Load fastly cache hit
        if (params.has('fastlyCacheHit')) {
            var value = params.get('fastlyCacheHit');
            $('#fastly-cache-hit').val(value + '%');
        }
        
        // Load origin egress cost
        if (params.has('originEgressCost')) {
            var value = params.get('originEgressCost');
            $('#origin-egress-cost').val('$' + value);
        }
        
        // Load toggle state
        if (params.has('toggle')) {
            var toggleState = params.get('toggle');
            if (toggleState === 'on') {
                $('.origin-shielding-wrapper').addClass('toggle-on').removeClass('toggle-off');
                fastlyToggle = true;
            } else if (toggleState === 'off') {
                $('.origin-shielding-wrapper').addClass('toggle-off').removeClass('toggle-on');
                fastlyToggle = false;
            }
        }
    }
    
    // Mark initial load as complete - now URL updates will work
    isInitialLoad = false;
    
    // Handle bandwidth unit dropdown
    $('#bandwidth-unit-dropdown').on('click', function(e) {
        e.stopPropagation();
        const menu = $('#bandwidth-unit-menu');
        const otherMenu = $('#request-size-unit-menu');
        
        // Close other dropdown if open
        otherMenu.removeClass('active');
        
        // Toggle current dropdown
        menu.toggleClass('active');
    });

    $('#bandwidth-unit-menu li').on('click', function(e) {
        e.stopPropagation();
        const value = $(this).data('value');
        $('#bandwidth-unit-dropdown .dropdown-value').text(value);
        $('#bandwidth-unit-menu').removeClass('active');
        
        // Recalculate everything when unit changes
        monthlyBandwidth = parseFloat($('#monthly-bandwidth').val()) || 0;
        monthlyBandwidthUnit = value;
        
        var bandwidthForCalc = monthlyBandwidth;
        if (monthlyBandwidthUnit === 'TB') {
            bandwidthForCalc = monthlyBandwidth * 1000;
        }
        
        currentOriginCost = Math.round(bandwidthForCalc * currentOriginHit * originEgressCost);
        fastlyOriginCost = Math.round(bandwidthForCalc * fastlyOriginHit * originEgressCost);
        monthlySavings = currentOriginCost - fastlyOriginCost;
        annualSavings = currentOriginCost * 12 - fastlyOriginCost * 12;
        
        // Update display
        var formattedBandwidth = formatBandwidth(monthlyBandwidth);
        monthlyBandwidthDisplay.text(formattedBandwidth + ' ' + monthlyBandwidthUnit);
        $('.chart-subtitle').text(formattedBandwidth + ' ' + monthlyBandwidthUnit + ' bandwidth');
        
        // Update all text elements
        $('.current-origin-cost').text('$' + currentOriginCost.toLocaleString());
        $('.fastly-origin-cost').text('$' + fastlyOriginCost.toLocaleString());
        $('.savings-percent').text(Math.trunc(((currentOriginCost - fastlyOriginCost)/currentOriginCost)*100) + '%');
        $('.annual-savings').text('$' + annualSavings.toLocaleString());
        $('.savings-amount').text('$' + monthlySavings.toLocaleString() + '/mo');
        
        if (fastlyToggle) {
            $('.bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
        } else {
            $('.bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
        }
        
        // Update chart
        initializeChart();
        
        // Update URL
        updateURLParams();
    });

    // Handle request size unit dropdown
    $('#request-size-unit-dropdown').on('click', function(e) {
        e.stopPropagation();
        const menu = $('#request-size-unit-menu');
        const otherMenu = $('#bandwidth-unit-menu');
        
        // Close other dropdown if open
        otherMenu.removeClass('active');
        
        // Toggle current dropdown
        menu.toggleClass('active');
    });

    $('#request-size-unit-menu li').on('click', function(e) {
        e.stopPropagation();
        const value = $(this).data('value');
        $('#request-size-unit-dropdown .dropdown-value').text(value);
        $('#request-size-unit-menu').removeClass('active');
    });

    // Close dropdowns when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.dropdown-wrapper').length) {
            $('.dropdown-menu').removeClass('active');
        }
    });

    var fastlyToggle = true;

    // Handle origin shielding toggle
    $('#origin-toggle').on('click', function() {
        const wrapper = $('.origin-shielding-wrapper');
        wrapper.toggleClass('toggle-on toggle-off');
        
        // Update bill amount based on toggle state
        if (wrapper.hasClass('toggle-on')) {
            $('#origin-bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
            fastlyToggle = true;
        } else {
            $('#origin-bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
            fastlyToggle = false;
        }
        
        // Update URL
        updateURLParams();
    });

    // Initialize toggle state (on by default)
    $('.origin-shielding-wrapper').addClass('toggle-on');
    
    // Initialize origin cost chart
    const ctx = document.getElementById('origin-cost-chart');
    var originCostChart = null;
    
    // Function to format bandwidth numbers (needed by updateAllDisplays)
    function formatBandwidth(num) {
        if (num >= 1000000000000) {
            // Trillions
            return (num / 1000000000000).toFixed(1) + 'T';
        } else if (num >= 1000000000) {
            // Billions
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            // Millions
            return (num / 1000000).toFixed(1) + 'M';
        } else {
            // Thousands and below - use comma formatting
            return num.toLocaleString();
        }
    }
    
    // Function to update all displayed values
    function updateAllDisplays() {
        // Re-read all input values
        var monthlyBandwidth = parseFloat($('#monthly-bandwidth').val()) || 0;
        var monthlyBandwidthUnit = $('#bandwidth-unit-dropdown .dropdown-value').text();
        var currentCacheHit = parseFloat($('#current-cache-hit').val().replace('%', '')) / 100 || 0;
        var currentOriginHit = 1 - currentCacheHit;
        var fastlyCacheHit = parseFloat($('#fastly-cache-hit').val().replace('%', '')) / 100 || 0;
        var fastlyOriginHit = 1 - fastlyCacheHit;
        var originEgressCost = parseFloat($('#origin-egress-cost').val().replace('$', '')) || 0;
        
        // Convert TB to GB for calculations
        var bandwidthForCalc = monthlyBandwidth;
        if (monthlyBandwidthUnit === 'TB') {
            bandwidthForCalc = monthlyBandwidth * 1000;
        }
        
        // Calculate costs
        var currentOriginCost = Math.round(bandwidthForCalc * currentOriginHit * originEgressCost);
        var fastlyOriginCost = Math.round(bandwidthForCalc * fastlyOriginHit * originEgressCost);
        var monthlySavings = currentOriginCost - fastlyOriginCost;
        var annualSavings = currentOriginCost * 12 - fastlyOriginCost * 12;
        
        // Update all displayed values
        $('.current-origin-cost').text('$' + currentOriginCost.toLocaleString());
        $('.fastly-origin-cost').text('$' + fastlyOriginCost.toLocaleString());
        $('.savings-percent').text(Math.trunc(((currentOriginCost - fastlyOriginCost)/currentOriginCost)*100) + '%');
        $('.annual-savings').text('$' + annualSavings.toLocaleString());
        $('.savings-amount').text('$' + monthlySavings.toLocaleString() + '/mo');
        
        // Update bill amount based on toggle state
        if (fastlyToggle) {
            $('.bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
            $('#origin-bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
        } else {
            $('.bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
            $('#origin-bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
        }
        
        // Update chart subtitle
        var formattedBandwidth = formatBandwidth(monthlyBandwidth);
        $('.chart-subtitle').text(formattedBandwidth + ' ' + monthlyBandwidthUnit + ' bandwidth');
        
        // Update chart
        initializeChart();
    }
    
    // Load URL parameters FIRST, before initializing chart and variables
    loadFromURLParams();
    
    // After loading from URL, update all displays and chart
    if (window.location.search) {
        updateAllDisplays();
    }
    
    // Function to initialize or update the chart
    function initializeChart() {
        // Calculate initial values
        var monthlyBandwidth = parseFloat($('#monthly-bandwidth').val()) || 100;
        var monthlyBandwidthUnit = $('#bandwidth-unit-dropdown .dropdown-value').text();
        
        // Convert TB to GB (1 TB = 1000 GB)
        if (monthlyBandwidthUnit === 'TB') {
            monthlyBandwidth = monthlyBandwidth * 1000;
        }
        
        var currentCacheHit = parseFloat($('#current-cache-hit').val().replace('%', '')) / 100 || 0.85;
        var currentOriginHit = 1 - currentCacheHit;
        var fastlyCacheHit = parseFloat($('#fastly-cache-hit').val().replace('%', '')) / 100 || 0.98;
        var fastlyOriginHit = 1 - fastlyCacheHit;
        var originEgressCost = parseFloat($('#origin-egress-cost').val().replace('$', '')) || 0.08;
        
        var currentOriginCost = Math.round(monthlyBandwidth * currentOriginHit * originEgressCost);
        var fastlyOriginCost = Math.round(monthlyBandwidth * fastlyOriginHit * originEgressCost);
        
        if (ctx) {
            if (originCostChart) {
                // Update existing chart
                originCostChart.data.datasets[0].data = [currentOriginCost, fastlyOriginCost];
                // Set Y-axis max to 110% of the maximum data value for cushion
                var maxValue = Math.max(currentOriginCost, fastlyOriginCost);
                var yAxisMax = maxValue * 1.1;
                originCostChart.options.scales.y.max = yAxisMax;
                // Calculate step size for evenly distributed ticks (3 ticks: 0, middle, max)
                originCostChart.options.scales.y.ticks.stepSize = yAxisMax / 2;
                originCostChart.update();
            } else {
                // Create new chart
                originCostChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Current state', 'With Fastly'],
                        datasets: [
                            {
                                label: 'Origin costs',
                                data: [currentOriginCost, fastlyOriginCost],
                                backgroundColor: '#121417',
                                borderColor: '#121417',
                                borderWidth: 0,
                                borderRadius: {
                                    topLeft: 8,
                                    topRight: 8,
                                    bottomLeft: 0,
                                    bottomRight: 0
                                }
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        resizeDelay: 0,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                enabled: true,
                                displayColors: false,
                                backgroundColor: '#3a424a',
                                titleColor: '#ffffff',
                                bodyColor: '#ffffff',
                                padding: 12,
                                titleFont: {
                                    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                    size: 12,
                                    weight: 600
                                },
                                bodyFont: {
                                    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                    size: 14,
                                    weight: 400
                                },
                                callbacks: {
                                    title: function() {
                                        return '';
                                    },
                                    label: function(context) {
                                        var label = context.label || '';
                                        var value = context.parsed.y;
                                        return label + ': $' + value.toLocaleString() + '/mo';
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                stacked: false,
                                grid: {
                                    display: false,
                                    drawBorder: false
                                },
                                ticks: {
                                    color: '#3a424a',
                                    font: {
                                        family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                        size: 14,
                                        weight: 400
                                    },
                                    padding: 8
                                }
                            },
                            y: {
                                stacked: false,
                                beginAtZero: true,
                                max: (function() {
                                    return Math.max(currentOriginCost, fastlyOriginCost) * 1.1;
                                })(),
                                ticks: {
                                    maxTicksLimit: 3,
                                    stepSize: (function() {
                                        var maxValue = Math.max(currentOriginCost, fastlyOriginCost);
                                        return (maxValue * 1.1) / 2;
                                    })(),
                                    color: '#677483',
                                    font: {
                                        family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                        size: 12,
                                        weight: 300
                                    },
                                    padding: 8,
                                    callback: function(value) {
                                        if (value === 0) return '$0';
                                        if (value < 1000) return '$' + value.toLocaleString();
                                        if (value < 1000000) return '$' + (value / 1000).toFixed(1) + 'K';
                                        return '$' + (value / 1000000).toFixed(1) + 'M';
                                    }
                                },
                                grid: {
                                    color: '#9EA8B2',
                                    lineWidth: 1,
                                    borderDash: [2, 2],
                                    drawBorder: true,
                                    borderColor: '#9EA8B2'
                                }
                            }
                        },
                        layout: {
                            padding: {
                                left: 0,
                                right: 16,
                                top: 8,
                                bottom: 16
                            }
                        },
                        interaction: {
                            intersect: false
                        }
                    }
                });
            }
        }
    }
    
    // Initialize chart on page load
    initializeChart();

    var monthlyBandwidthDisplay = $('#monthly-bandwidth-display');

    // Inputs
    var monthlyBandwidth = parseFloat($('#monthly-bandwidth').val());
    var monthlyBandwidthUnit = $('#bandwidth-unit-dropdown .dropdown-value').text();
    
    // Convert TB to GB for calculations (1 TB = 1000 GB)
    var bandwidthForCalc = monthlyBandwidth;
    if (monthlyBandwidthUnit === 'TB') {
        bandwidthForCalc = monthlyBandwidth * 1000;
    }
    
    var requestSize = parseFloat($('#request-size').val());
    var currentCacheHit = parseFloat($('#current-cache-hit').val().replace('%', '')) / 100;
    var currentOriginHit = 1 - currentCacheHit;
    var fastlyCacheHit = parseFloat($('#fastly-cache-hit').val().replace('%', '')) / 100;
    var fastlyOriginHit = 1 - fastlyCacheHit;
    var originEgressCost = parseFloat($('#origin-egress-cost').val().replace('$', ''));
    var currentOriginCost = Math.round(bandwidthForCalc * currentOriginHit * originEgressCost);
    var fastlyOriginCost = Math.round(bandwidthForCalc * fastlyOriginHit * originEgressCost);
    var monthlySavings = currentOriginCost - fastlyOriginCost
    var annualSavings = currentOriginCost * 12 - fastlyOriginCost * 12

    $('#monthly-bandwidth').keyup(function() {
        monthlyBandwidth = parseFloat($(this).val()) || 0;
        var bandwidthForCalc = monthlyBandwidth;
        
        // Convert TB to GB for calculations
        if (monthlyBandwidthUnit === 'TB') {
            bandwidthForCalc = monthlyBandwidth * 1000;
        }
        
        currentOriginCost = Math.round(bandwidthForCalc * currentOriginHit * originEgressCost);
        fastlyOriginCost = Math.round(bandwidthForCalc * fastlyOriginHit * originEgressCost);
        monthlySavings = currentOriginCost - fastlyOriginCost;
        annualSavings = currentOriginCost * 12 - fastlyOriginCost * 12;

        if (monthlyBandwidthUnit === 'TB') {
            monthlyBandwidthDisplay.text((monthlyBandwidth).toLocaleString() + ' ' + monthlyBandwidthUnit);
        } else {
            monthlyBandwidthDisplay.text((monthlyBandwidth).toLocaleString() + ' ' + monthlyBandwidthUnit);
        }

        $('.current-origin-cost').text('$' + currentOriginCost.toLocaleString());
        
        $('.fastly-origin-cost').text('$' + fastlyOriginCost.toLocaleString());
        
        $('.savings-percent').text(Math.trunc(((currentOriginCost - fastlyOriginCost)/currentOriginCost)*100) + '%');
        
        $('.annual-savings').text('$' + annualSavings.toLocaleString());
        
        $('.savings-amount').text('$' + monthlySavings.toLocaleString() + '/mo');
        
        if (fastlyToggle) {
            $('.bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
        } else {
            $('.bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
        }

        var formattedBandwidth = formatBandwidth(monthlyBandwidth);
        $('.chart-subtitle').text(formattedBandwidth + ' ' + monthlyBandwidthUnit + ' bandwidth');
        
        // Update chart
        initializeChart();
        
        // Update URL
        updateURLParams();
    });
    $('#current-cache-hit').on('input', function() {
        var input = $(this);
        var currentVal = input.val();
        var rawValue = currentVal.replace(/[^0-9.]/g, ''); // Remove all non-numeric characters except decimal
        
        // Ensure % suffix is present, but allow natural typing
        if (rawValue !== '' && !isNaN(rawValue) && rawValue !== '.') {
            var numValue = parseFloat(rawValue);
            // Cap at 100% for calculations, but allow user to type and edit
            if (numValue > 100) {
                currentCacheHit = 1.0; // Cap at 100% for calculations
            } else {
                currentCacheHit = numValue / 100;
            }
            
            // Only add % if it's not already there, and don't force 100% display while typing
            if (!currentVal.endsWith('%')) {
                input.val(rawValue + '%');
            }
        } else if (rawValue === '' || rawValue === '.') {
            currentCacheHit = 0;
            if (currentVal === '' || currentVal === '%') {
                input.val('');
            }
        }
        currentOriginHit = 1 - currentCacheHit;
        
        var bandwidthForCalc = monthlyBandwidth;
        if (monthlyBandwidthUnit === 'TB') {
            bandwidthForCalc = monthlyBandwidth * 1000;
        }

        console.log(currentCacheHit)
        
        currentOriginCost = Math.round(bandwidthForCalc * currentOriginHit * originEgressCost);
        fastlyOriginCost = Math.round(bandwidthForCalc * fastlyOriginHit * originEgressCost);
        monthlySavings = currentOriginCost - fastlyOriginCost;
        annualSavings = currentOriginCost * 12 - fastlyOriginCost * 12;
        
        $('.current-origin-cost').text('$' + currentOriginCost.toLocaleString());
        $('.fastly-origin-cost').text('$' + fastlyOriginCost.toLocaleString());
        $('.savings-percent').text(Math.trunc(((currentOriginCost - fastlyOriginCost)/currentOriginCost)*100) + '%');
        $('.annual-savings').text('$' + annualSavings.toLocaleString());
        
        $('.savings-amount').text('$' + monthlySavings.toLocaleString() + '/mo');
        
        if (fastlyToggle) {
            $('.bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
        } else {
            $('.bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
        }
        
        // Update chart
        initializeChart();
        
        // Update URL
        updateURLParams();
    });
    $('#fastly-cache-hit').on('input', function() {
        var input = $(this);
        var currentVal = input.val();
        var rawValue = currentVal.replace(/[^0-9.]/g, ''); // Remove all non-numeric characters except decimal
        
        // Ensure % suffix is present, but allow natural typing
        if (rawValue !== '' && !isNaN(rawValue) && rawValue !== '.') {
            var numValue = parseFloat(rawValue);
            // Cap at 100% for calculations, but allow user to type and edit
            if (numValue > 100) {
                fastlyCacheHit = 1.0; // Cap at 100% for calculations
            } else {
                fastlyCacheHit = numValue / 100;
            }
            
            // Only add % if it's not already there, and don't force 100% display while typing
            if (!currentVal.endsWith('%')) {
                input.val(rawValue + '%');
            }
        } else if (rawValue === '' || rawValue === '.') {
            fastlyCacheHit = 0;
            if (currentVal === '' || currentVal === '%') {
                input.val('');
            }
        }
        fastlyOriginHit = 1 - fastlyCacheHit;
        
        var bandwidthForCalc = monthlyBandwidth;
        if (monthlyBandwidthUnit === 'TB') {
            bandwidthForCalc = monthlyBandwidth * 1000;
        }
        
        currentOriginCost = Math.round(bandwidthForCalc * currentOriginHit * originEgressCost);
        fastlyOriginCost = Math.round(bandwidthForCalc * fastlyOriginHit * originEgressCost);
        monthlySavings = currentOriginCost - fastlyOriginCost;
        annualSavings = currentOriginCost * 12 - fastlyOriginCost * 12;
        
        $('.current-origin-cost').text('$' + currentOriginCost.toLocaleString());
        $('.fastly-origin-cost').text('$' + fastlyOriginCost.toLocaleString());
        $('.savings-percent').text(Math.trunc(((currentOriginCost - fastlyOriginCost)/currentOriginCost)*100) + '%');
        $('.annual-savings').text('$' + annualSavings.toLocaleString());
        
        $('.savings-amount').text('$' + monthlySavings.toLocaleString() + '/mo');
        
        if (fastlyToggle) {
            $('.bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
        } else {
            $('.bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
        }
        
        // Update chart
        initializeChart();
        
        // Update URL
        updateURLParams();
    });
    $('#origin-egress-cost').on('input', function() {
        var input = $(this);
        var currentVal = input.val();
        var rawValue = currentVal.replace(/[^0-9.]/g, ''); // Remove all non-numeric characters except decimal
        
        // Ensure $ prefix is present
        if (!currentVal.startsWith('$') && rawValue !== '') {
            input.val('$' + rawValue);
        } else if (currentVal === '' || (currentVal === '$' && rawValue === '')) {
            input.val('$');
            originEgressCost = 0;
        }
        
        // Update the variable for calculations
        if (rawValue !== '' && !isNaN(rawValue) && rawValue !== '.') {
            originEgressCost = parseFloat(rawValue);
        } else {
            originEgressCost = 0;
        }
        
        var bandwidthForCalc = monthlyBandwidth;
        if (monthlyBandwidthUnit === 'TB') {
            bandwidthForCalc = monthlyBandwidth * 1000;
        }
        
        currentOriginCost = Math.round(bandwidthForCalc * currentOriginHit * originEgressCost);
        fastlyOriginCost = Math.round(bandwidthForCalc * fastlyOriginHit * originEgressCost);
        monthlySavings = currentOriginCost - fastlyOriginCost;
        annualSavings = currentOriginCost * 12 - fastlyOriginCost * 12;
        
        $('.current-origin-cost').text('$' + currentOriginCost.toLocaleString());
        $('.fastly-origin-cost').text('$' + fastlyOriginCost.toLocaleString());
        $('.savings-percent').text(Math.trunc(((currentOriginCost - fastlyOriginCost)/currentOriginCost)*100) + '%');
        $('.annual-savings').text('$' + annualSavings.toLocaleString());
        
        $('.savings-amount').text('$' + monthlySavings.toLocaleString() + '/mo');
        
        if (fastlyToggle) {
            $('.bill-amount').text('$' + fastlyOriginCost.toLocaleString() + '/mo');
        } else {
            $('.bill-amount').text('$' + currentOriginCost.toLocaleString() + '/mo');
        }
        
        // Update chart
        initializeChart();
        
        // Update URL
        updateURLParams();
    });
    
    // Format origin egress cost on blur
    $('#origin-egress-cost').on('blur', function() {
        var input = $(this);
        var rawValue = input.val().replace(/[^0-9.]/g, '');
        if (rawValue !== '' && !isNaN(rawValue) && rawValue !== '.') {
            var numValue = parseFloat(rawValue);
            input.val('$' + numValue.toFixed(2));
            originEgressCost = numValue;
        } else {
            input.val('$0.00');
            originEgressCost = 0;
        }
    });
    
    // Format cache hit ratios on blur
    $('#current-cache-hit').on('blur', function() {
        var input = $(this);
        var rawValue = input.val().replace(/[^0-9.]/g, '');
        if (rawValue !== '' && !isNaN(rawValue) && rawValue !== '.') {
            var numValue = parseFloat(rawValue);
            if (numValue > 100) numValue = 100;
            input.val(numValue + '%');
            currentCacheHit = numValue / 100;
            currentOriginHit = 1 - currentCacheHit;
        } else {
            input.val('0%');
            currentCacheHit = 0;
            currentOriginHit = 1;
        }
    });
    
    $('#fastly-cache-hit').on('blur', function() {
        var input = $(this);
        var rawValue = input.val().replace(/[^0-9.]/g, '');
        if (rawValue !== '' && !isNaN(rawValue) && rawValue !== '.') {
            var numValue = parseFloat(rawValue);
            if (numValue > 100) numValue = 100;
            input.val(numValue + '%');
            fastlyCacheHit = numValue / 100;
            fastlyOriginHit = 1 - fastlyCacheHit;
        } else {
            input.val('0%');
            fastlyCacheHit = 0;
            fastlyOriginHit = 1;
        }
    });
    
    // Origin savings card metrics

});

