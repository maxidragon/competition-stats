import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Link,
    Tooltip,
} from "@mui/material";
import Flag from "react-world-flags";
import { SORWithPosition } from "../../../logic/interfaces";
import { EventId } from "../../../logic/wcif";
import { eventName, eventShortName } from "../../../logic/events";
import { WCA_ORIGIN } from "../../../logic/request";

interface SORTableProps {
    data: SORWithPosition[];
    eventIds: EventId[];
}

const SORTable = ({ data, eventIds }: SORTableProps) => {
    return (
        <Table size="small" stickyHeader>
            <TableHead>
                <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Sum of ranks</TableCell>
                    {eventIds.map((eventId) => (
                        <TableCell key={eventId} align="right">
                            <Tooltip title={eventName(eventId)}>
                                <span>{eventShortName(eventId)}</span>
                            </Tooltip>
                        </TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((item: SORWithPosition) => (
                    <TableRow key={item.person.registrantId}>
                        <TableCell>{item.position}</TableCell>
                        <TableCell>
                            <Flag
                                code={item.person.countryIso2.toLowerCase()}
                                width="32"
                            />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {item.person.wcaId ? (
                                <Link
                                    href={`${WCA_ORIGIN}/persons/${item.person.wcaId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.person.name}
                                </Link>
                            ) : (
                                item.person.name
                            )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                            {item.value}
                        </TableCell>
                        {eventIds.map((eventId) => {
                            const ranking = item.rankings[eventId];
                            return (
                                <TableCell
                                    key={eventId}
                                    align="right"
                                    // Rankings the competitor did not earn are dimmed, so
                                    // the sum can be checked against what they competed in.
                                    sx={{
                                        color: ranking.competed
                                            ? "text.primary"
                                            : "text.disabled",
                                        fontStyle: ranking.competed ? "normal" : "italic",
                                    }}
                                >
                                    {ranking.ranking}
                                </TableCell>
                            );
                        })}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

};

export default SORTable;
