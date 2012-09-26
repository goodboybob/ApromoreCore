package org.apromore.canoniser.yawl.yawl2cpf.patterns.controlflow;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.util.List;

import org.apromore.canoniser.yawl.utils.TestUtils;
import org.apromore.canoniser.yawl.yawl2cpf.patterns.BasePatternTest;
import org.apromore.cpf.EdgeType;
import org.apromore.cpf.NetType;
import org.apromore.cpf.NodeType;
import org.apromore.cpf.StateType;
import org.apromore.cpf.TaskType;
import org.junit.Test;

public class DeferredChoiceTest extends BasePatternTest {

    /*
     * (non-Javadoc)
     * 
     * @see org.apromore.canoniser.yawl.BaseYAWL2CPFTest#getYAWLFile()
     */
    @Override
    protected File getYAWLFile() {
        return new File(TestUtils.TEST_RESOURCES_DIRECTORY + "YAWL/Patterns/ControlFlow/WPC16DeferredChoice.yawl");
    }

    @Test
    public void testDeferredChoice() {
        final NetType rootNet = yawl2Canonical.getCpf().getNet().get(0);
        assertEquals(7, rootNet.getEdge().size());
        assertEquals(7, rootNet.getNode().size());

        checkNode(rootNet, "A", TaskType.class, 1, 1);
        checkNode(rootNet, "B", StateType.class, 1, 2);
        checkNode(rootNet, "C", TaskType.class, 1, 1);
        final NodeType nodeD = checkNode(rootNet, "D", TaskType.class, 1, 1);

        final List<EdgeType> cEdges = getOutgoingEdges(rootNet, nodeD.getId());
        assertEquals(1, cEdges.size());
        final NodeType joiningNode = getNodeByID(rootNet, cEdges.get(0).getTargetId());
        assertTrue("Joining Node should be StateType", joiningNode instanceof StateType);
        assertEquals(2, countIncomingEdges(rootNet, joiningNode.getId()));
        assertEquals(1, countOutgoingEdges(rootNet, joiningNode.getId()));

    }

}