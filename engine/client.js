var vis;
var scroll;
var circle;
var t;
var drawer;
var game_console;
var agent;
var cu;

$(function() {

    game_console = new Console(
        document.getElementById("console-input"),
        document.getElementById("console-output"),
        new Echoer()
    );
    game_console.setup_keys();
    $("#console-container").hide();
    $("#info-overlay").hide();

    var fps_stats = new Stats();
    fps_stats.setMode(0);
    fps_stats.domElement.style.position = 'relative';
    fps_stats.domElement.style.float = 'left';
    document.getElementById('info-overlay').appendChild(fps_stats.domElement);
    var ms_stats = new Stats();
    ms_stats.setMode(1);
    ms_stats.domElement.style.position = 'relative';
    document.getElementById('info-overlay').appendChild(ms_stats.domElement);


    Input.set_canvas_offset(parseInt($("#screen").css("left")), parseInt($("#screen").css("top")));
    Input.init();
    var pos = [200, 200];
    agent = new Agent(pos, 0);

    var canvas = document.getElementById('screen');
    
    $(document).resize(function() {
        canvas.width = $(window).width();
        canvas.height = $(window).height();
    });

    canvas.width = $(window).width();
    canvas.height = $(window).height();
    if (window.location.hash == '#canvas') {
        drawer = new CanvasDrawer(canvas);
        cu = new CanvasUtil(canvas);
    } else {
        drawer = new WebGLDrawer(canvas);
    }
    drawer.update_resolution();
   

    Content.load();
    Content.set_drawer(drawer);
    
    new AsyncGroup(
        new FileLoader('shaders/', ['standard_vertex_shader.glsl', 'standard_fragment_shader.glsl']),
        Content
    ).run(function(shaders, images) {
        
        drawer.standard_shaders(shaders[0], shaders[1]);
        drawer.init_uniforms();
        
        drawer.sync_buffers();

        
        var map_demo = Content.maps.map_demo;
        
        map_demo.update_lights();
       

        var demo = Content.characters.walk_demo.instance('still');
        
        agent.enter_region(map_demo.region_hash.r3);
        agent.enter_level(map_demo.level_hash.level2);
        
        var filterer = drawer.filter_pipeline([0, 0], [canvas.width, canvas.height]).set_filters();
        var capture = drawer.capture([0, 0], [canvas.width, canvas.height]);
        var capture2 = drawer.capture([0, 0], [canvas.width, canvas.height]);
        var capture3 = drawer.capture([0, 0], [canvas.width, canvas.height]);
        circle = drawer.circle([0, 0], agent.rad, [0,0,0,0.5]);

        var dradial = drawer.dynamic_radial([100, 100], [], 128, canvas.width, canvas.height);

        var follow_light = drawer.light(150, [0.6,0.6,1,1]);
        
        agent.facing = -Math.PI/2;
        agent.move_speed = 400;
        var state = 1;
        var tm = new TimeManager();
       
        scroll = new ScrollContext([0, 0], 200, [$(window).width(), $(window).height()]);
        
        drawer.sync_buffers();
/*
        var a = [
[[282.8317612765368, 203.02930278579868], [289.6317612765368, 203.02930278579868]], 
[[289.39052451698313, 201.12843487347743], [295.7905245169831, 201.12843487347743]], 
[[295.7258689155711, 200.17306140080856], [295.7258689155711, 206.97306140080858]], 
[[288.3615218800824, 201.36323613210098], [288.3615218800824, 207.76323613210099]], 
[[281.7819279889531, 203.42648339365354], [281.7819279889531, 217.02648339365354]], 
[[269.26928378043175, 210.54646086133647], [269.26928378043175, 216.94646086133648]], 
[[264.32718204419893, 214.95087142166082], [264.32718204419893, 221.75087142166083]], 
[[259.8023062484483, 220.24876747703388], [259.8023062484483, 227.0487674770339]], 
[[256.08510726658983, 226.07359651290116], [256.08510726658983, 232.47359651290117]], 
[[253.36674378002454, 231.93536019736013], [253.36674378002454, 238.73536019736014]], 
[[251.33967900579435, 238.46032957076866], [251.33967900579435, 245.26032957076868]], 
[[250.22316428201913, 245.1773901063074], [250.22316428201913, 258.3773901063074]], 
[[250.00000000000003, 250], [250.00000000000003, 256.8]]
];
        var b = [[268.0083261120685, 207.1020793401819], [268.0083261120685, 213.9020793401819]];
        var point = [300, 250];
        var start = [250.00757500124112, 249.1296881343632];
        var end = [250.00757500124112, 255.5296881343632];
        
        agent.region.collision_processor.process(
            b[0],
            b[1],
            50
        );
        console.debug('done');
        for (var i = 0;i<a.length;i++) {
            var distance = a[i][0].v2_dist(point);
            console.debug('process', a[i][0], a[i][1], 50);
            console.debug('distance', distance);
            if (distance < 50) {
                error1();
            }
            agent.region.collision_processor.process(
                a[i][0],
                a[i][1],
                50
            );
        }

        
        agent.region.collision_processor.process(start, end, 50);
        console.debug('done');
        return;
*/
        t = function() {
            fps_stats.begin();
            ms_stats.begin();
            
            var time_delta = tm.get_delta();
            
            var original_position = agent.pos.slice();

            if (state == 0 && agent.absolute_control_tick(time_delta)) {
                state = 1;
                demo.update('walk', 100, -100);
            } else if (state == 1 && !agent.absolute_control_tick(time_delta)) {
                state = 0;
                demo.update('still');
                agent.stop();
            }
     
            // switch current region if necessary
            agent.border_detect();

            // show/hide regions if necessary
            agent.level_detect();

            // reset the drawer
            drawer.glm.set_clear_colour([0,0,0,1]);
            drawer.clear();
            drawer.glm.set_clear_colour([1,1,1,1]);
            drawer.remove_filters();
 
            Scene.base(capture, drawer, scroll, agent, demo, map_demo);
            //Scene.lighting(capture2, drawer, scroll, agent, dradial, follow_light, capture);
            //Scene.visible_area(capture3, drawer, scroll, agent, dradial, capture2);
            
            // draw the line segments and character
            /*
            drawer.u_opacity.set(0.2);
            capture.draw();
            drawer.u_opacity.set(1);
            
            capture3.draw();
            */
            capture.draw();

            scroll.proceed();

            // sync the cpu for smooth animation
            drawer.sync_gpu();
            // progress the time
            demo.tick(time_delta);
            // repeat on the next frame
            requestAnimationFrame(t);

            // record some stats
            fps_stats.end();
            ms_stats.end();
        }
        t();


    }.arr_args());
});

function Scene(){}
Scene.base = function(capture, drawer, scroll, agent, character, map) {
    // set up gl to draw to a framebuffer
    capture.begin();

    // apply global translation (for scrolling)
    drawer.save();
    drawer.translate(scroll.translate);
   
    // apply local transformation (for moving the character)
    drawer.save();
    drawer.translate(agent.pos).rotate(agent.facing+Math.PI/2);

    // draw the character
    character.draw();
    circle.draw();
            
    scroll.set_next(drawer.global_centre());
    
    // back to the scroll transformation
    drawer.restore();
    
    // draw the map line segments
    map.draw();

    // remove all transformations
    drawer.restore();
    
    // capture contains all the line segments and the character
    capture.end();
}

Scene.lighting = function(capture, drawer, scroll, agent, dradial, follow_light, background) {
    drawer.glm.set_clear_colour([0,0,0,0]);
    
    // fill a buffer with all the lit areas
    capture.begin();

    /* draw the original capture into the lighting buffer so when this buffer
     * is used to texture the visible area the original drawing is also present
     */
    drawer.u_opacity.set(0.4);
    background.draw();
    drawer.u_opacity.set(1);
    
    // translate back to the scroll position
    drawer.save();
    drawer.translate(scroll.translate);
    
    dradial.update(agent.pos, agent.level.visibility_context.visible_polygon(agent.pos.v2_floor()));

    // draw lit areas to a buffer

    agent.level.lights.map(function(l) {
        l.draw(background.texture);
    });

    drawer.glm.disable_blend();
    follow_light.draw_to_buffer_with(background.texture, agent.pos, dradial);
    drawer.glm.enable_blend();
    
    drawer.restore();
    
    follow_light.draw_buffer();

    capture.end();

}

Scene.visible_area = function(capture, drawer, scroll, agent, dradial, background) {
    capture.begin();
    // translate back to the scroll position
    drawer.save();
    drawer.translate(scroll.translate);
    
    drawer.u_opacity.set(1);

    dradial.draw_no_blend(background.texture);
    
    drawer.draw_point(agent.pos, tc('black'), 4);

    drawer.restore();

    capture.end();
 
}
