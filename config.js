module.exports = {
    email_notifications: false,
    web_server: true,
    web_server_port: 8080,
    web_server_host: "0.0.0.0",
    ingest_dir: process.env.TRANSCODE_INGEST_FOLDER,
    output_dir: process.env.TRANSCODE_OUTPUT_FOLDER,
    db: {
        host: process.env.DB_HOST,
        user: process.env.TRANSCODE_DB_USER,
        password: process.env.TRANSCODE_DB_PASSWORD,
        database: process.env.TRANSCODE_DB_NAME
    },
    rules: [
        {
            extension: "CR2",
            convert: "JPG"
        },
        {
            extension: "CR3",
            convert: "JPG"
        }
    ]
}