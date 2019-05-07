/*
 * Copyright © 2019 The University of Melbourne.
 *
 * This file is part of "Apromore".
 *
 * "Apromore" is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 3 of the
 * License, or (at your option) any later version.
 *
 * "Apromore" is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty
 * of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program.
 * If not, see <http://www.gnu.org/licenses/lgpl-3.0.html>.
 */

package org.apromore.plugin.processdiscoverer;

import org.apromore.plugin.processdiscoverer.impl.filter.Action;
import org.apromore.plugin.processdiscoverer.impl.filter.Containment;
import org.apromore.plugin.processdiscoverer.impl.filter.Level;
import org.deckfour.xes.model.XEvent;
import org.deckfour.xes.model.XTrace;

import java.util.Set;

/**
 * Created by Raffaele Conforti (conforti.raffaele@gmail.com) on 05/08/2018.
 */
public interface LogFilterCriterion {

    Level getLevel();
    Containment getContainment();
    Action getAction();

    String getAttribute();

    boolean isToRemove(XTrace trace);
    boolean isToRemove(XEvent event);

    Set<String> getValue();
}