

$(async () =>  {
    Handlebars.registerHelper('formatDuration', function(seconds) {
        if (seconds === undefined || seconds === null || isNaN(seconds)) {
            return '00:00';
        }
        
        const totalSeconds = Math.floor(Number(seconds));
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        const pad = (num) => String(num).padStart(2, '0');
        
        if (h > 0) {
            return `${pad(h)}:${pad(m)}:${pad(s)}`; 
        } else {
            return `${pad(m)}:${pad(s)}`;
        }
    });
    Handlebars.registerHelper('stringify', function(json) {
        return new Handlebars.SafeString(JSON.stringify(json));
    });

    const showCustomToast = (message, isError = false) => {
        Toastify({
            text: message,
            duration: 3000,
            close: true, 
            gravity: "top",
            position: "right",
            stopOnFocus: true, 
            style: {
                background: isError ? "#e74c3c" : "#18bc9c",
                borderRadius: "0.375rem",
                boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)"
            }
        }).showToast();
    };


    const template = Handlebars.compile($("#view-template").html());
    const response = await (await fetch("/m3ugen/api/configure")).json();
  
    const loading = {
        show : () => {
            $('#loading').removeClass('d-none');
        },
        hide : () => {
            $('#loading').addClass('d-none');
        },
    };

    const reloadView = (data) => {
        loading.show();

        const html = template(data);
        $("#container").html(html);
        window.scroll({top: 0,behavior: "smooth",});

        const keymap = {};
        data.forEach(element => {
            keymap[element.key] = true;
        });

        const filter_keys = Object.keys(keymap);
        const $select = $('#filter-select');
        const $all_option = $('<option>', {value: 'all',text: '全て'});
        $select.append($all_option);
        filter_keys.forEach(element => {
            const $option = $('<option>', {
                value: element,
                text: element
            });
            $select.append($option);
        });
        $select.find('option:first').prop('selected', true);


        setTimeout(() => {loading.hide();}, 1000);
    };

    (() => {
        const $select = $('#target-select');
        response.data.m3u.forEach(element => {
            const $option = $('<option>', {
                value: element,
                text: element
            });
            $select.append($option);
        });
        $select.find('option:first').prop('selected', true);
    })();

    $(document).on("click", "#reload-btn", async (e) => {
        loading.show();
        const response = await (await fetch("/m3ugen/api/scan", {method: 'POST'})).json();
        reloadView(response.data);

        showCustomToast('再読み込が完了しました', false);
        return false;
    });

    $(document).on("click", "#create-btn", async (e) => {
        const target = $("#target-select").val();

        const output = ["#EXTM3U", "#PLAYLIST:" +target+ "のお気に入り"];

        $(".itemCheck:checked").each((index, element) => {
            const text = $(element).attr("data-json");
            const json = JSON.parse(text);

            const text1 = '#EXTINF:' + (json.duration) + ' tvg-logo="' +(json.image)+ '" group-title="' +(json.key)+ '",' + (json.title);
            const text2 = json.url;
            output.push(text1);
            output.push(text2);
        });

        const m3u = output.join('\n');

        const response = await (await fetch("/m3ugen/api/m3u/"+target, {
            method: 'PUT',
            headers: {"Content-Type": "text/plain; charset=utf-8"},
            body: m3u,
        })).json();

        showCustomToast('作成が完了しました', false);
        return false;
    });

    $(document).on("change", "#filter-select", async (e) => {
        const val = $("#filter-select").val();

        if(val === "all") {
            $("a.music").removeClass('hide');
        } else {
            $("a.music").addClass('hide');
            $("a.music."+val).removeClass('hide');       
        }

        return false;
    });


    reloadView(response.data.musics);
});