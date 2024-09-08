interface MetadataProps {
    titlePrefix?: string;
    description?: string;
}

export default function Metadata({ titlePrefix, description = "Analyzing Human Traffic. Powered by AWS Rekognition."}: MetadataProps) {
    const title = (titlePrefix !== undefined) ? `${titlePrefix} | Itsuki Analyer` : "Itsuki Analyer"

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
        </>
    );
}