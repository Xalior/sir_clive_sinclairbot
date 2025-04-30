declare module '../package.json' {
    interface PackageJson {
        name?: string;
        version?: string;
        description?: string;
        author?: string;
        bugs?: {
            url?: string;
        },
        homepage?: string;
    }

    const packageJson: PackageJson;
    export default packageJson;
}
