import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, Paper, Typography } from "@mui/material";

import { getWcif } from "../../logic/competitions";
import LoadingPage from "../../Components/LoadingPage";
import { SORWithPosition } from "../../logic/interfaces";
import { Competition as ICompetition } from "../../logic/wcif";
import SORTable from "./Components/SORTable";
import { calculateSor } from "../../logic/sor";

const Competition = () => {
    const { id } = useParams<{ id: string }>();
    const [wcif, setWcif] = useState<ICompetition | null>(null);
    const [sor, setSor] = useState<SORWithPosition[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setWcif(null);
        setError(null);
        getWcif(id)
            .then((data) => {
                if (cancelled) return;
                setWcif(data);
                setSor(calculateSor(data));
            })
            .catch((err) => {
                if (cancelled) return;
                console.error(err);
                setError("Could not load the results for this competition.");
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!wcif) return <LoadingPage />;

    return (
        <Box sx={{
            py: { xs: 2, md: 3 },
            px: { xs: 1, md: 3 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 2,
            textAlign: "center",
            alignItems: "center",

        }}>
            <Typography variant="h4">{wcif.name}</Typography>
            {sor.length > 0 ? (
                <>
                    <Typography variant="body2" color="text.secondary">
                        {sor.length} competitors
                    </Typography>
                    <Paper sx={{ p: 2, maxHeight: "80vh", overflow: "auto" }}>
                        <SORTable data={sor} />
                    </Paper>
                </>
            ) : (
                <Alert severity="info">
                    No results are available for this competition yet. The WCA only
                    serves round results in the WCIF while a competition is recent, so
                    the sum of ranks cannot be calculated here.
                </Alert>
            )}
        </Box>
    );
};

export default Competition;
