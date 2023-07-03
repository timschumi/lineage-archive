async function start_refresh_loop(build_id) {
    const table_status = document.getElementById('table_status');

    while (true) {
        let response = await fetch('/api/uploads/' + build_id, { cache: "reload" });

        // Maybe the upload is done?
        if (response.status === 404) {
            let check_response = await fetch('/api/builds/' + build_id, { cache: "reload" });
            let check_data = await check_response.json();

            if (check_data['url'] != null) {
                table_status.innerHTML = "<a href='" + check_data['url'] + "'>Download</a>";
                return;
            }
        }

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw new Error(response.statusText);
        }

        if (!response.ok) {
            throw new Error(data['message']);
        }

        if (data['error'] !== undefined) {
            throw new Error(data['error']);
        }

        if (data['progress'] !== 0) {
            table_status.innerHTML = "Uploading (" + (100 * data['progress'] / data['size']).toFixed(1) + "%)";
        } else {
            table_status.innerHTML = "Queued";
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

function request_upload(build_id) {
    const table_status = document.getElementById('table_status');

    async function request() {
        let response = await fetch('/api/uploads', {
            method: 'POST',
            body: JSON.stringify({"id": build_id}),
            cache: "reload",
        });

        if (response.ok)
            return;

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw new Error(response.statusText);
        }

        throw new Error(data['message']);
    }

    request()
        .then(() => start_refresh_loop(build_id))
        .catch((error) => {
            table_status.innerHTML = "Upload failed: " + error;
        });
}

let build_id = Number(window.location.pathname.split('/').slice(-1));

// Populate the build table.
fetch('/api/builds/' + build_id, { cache: "reload" })
    .then((response) => response.json())
    .then((build) => {
        document.title = build['filename'] + " - LineageOS Build Archive";

        const build_name_header = document.getElementById('build_name_header');
        build_name_header.innerHTML = build['filename'];

        const table_filename = document.getElementById('table_filename');
        table_filename.innerHTML = "<pre>" + build['filename'] + "</pre>";

        const table_filesize = document.getElementById('table_filesize');
        table_filesize.innerHTML = human_readable_size(build['filesize']) + " (" + build['filesize'] + " bytes)";

        const table_md5 = document.getElementById('table_md5');
        table_md5.innerHTML = "<pre>" + build['md5'] + "</pre>";

        const table_sha1 = document.getElementById('table_sha1');
        table_sha1.innerHTML = "<pre>" + build['sha1'] + "</pre>";

        const table_sha256 = document.getElementById('table_sha256');
        table_sha256.innerHTML = "<pre>" + build['sha256'] + "</pre>";

        const table_sha512 = document.getElementById('table_sha512');
        table_sha512.innerHTML = "<pre>" + build['sha512'] + "</pre>";

        const table_status = document.getElementById('table_status');
        if (build['url'] != null)
            table_status.innerHTML = "<a href='" + build['url'] + "'>Download</a>";
        else if (build['path'] != null)
            table_status.innerHTML = "<a href='javascript:request_upload(" + build['id'] + ")'>Request Upload</a>";
        else
            table_status.innerHTML = "Unavailable";
    })